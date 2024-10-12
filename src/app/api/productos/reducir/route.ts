import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, DecodedToken } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;
    if (!decoded || decoded.rol !== 'Almacen') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { productoId, vendedorId, cantidad } = body;
    if (!productoId || !vendedorId || !cantidad) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Inicio de la transacción
    await query('BEGIN');

    // Verificar que el vendedor tenga el producto y obtener la cantidad actual
    const usuarioProductoResult = await query(
      'SELECT cantidad FROM usuario_productos WHERE usuario_id = $1 AND producto_id = $2',
      [vendedorId, productoId]
    );

    if (usuarioProductoResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ 
        error: 'El vendedor no tiene este producto asignado'
      }, { status: 404 });
    }

    const cantidadActual = usuarioProductoResult.rows[0].cantidad;
    if (cantidad > cantidadActual) {
      await query('ROLLBACK');
      return NextResponse.json({
        error: 'La cantidad a reducir es mayor que la cantidad disponible'
      }, { status: 400 });
    }

    // Reducir la cantidad del producto para el vendedor
    await query(
      'UPDATE usuario_productos SET cantidad = cantidad - $1 WHERE usuario_id = $2 AND producto_id = $3',
      [cantidad, vendedorId, productoId]
    );

    // Aumentar la cantidad del producto en el almacén
    await query(
      'UPDATE productos SET cantidad = cantidad + $1 WHERE id = $2',
      [cantidad, productoId]
    );

    // Crear una transacción para registrar esta operación
    await query(
      'INSERT INTO transacciones (producto_id, usuario_id, cantidad, tipo, desde, hacia) VALUES ($1, $2, $3, $4, $5, $6)',
      [productoId, vendedorId, cantidad, 'Baja', 'Vendedor', 'Almacen']
    );

    // Confirmar la transacción
    await query('COMMIT');

    return NextResponse.json({
      message: 'Cantidad de producto reducida exitosamente'
    });
  } catch (error) {
    // Revertir la transacción en caso de error
    await query('ROLLBACK');
    console.error('Error al reducir la cantidad del producto:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}