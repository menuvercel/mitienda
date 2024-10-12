import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded || decoded.rol !== 'Almacen') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { productoId, vendedorId, cantidad } = body;

    console.log('Datos de transacción recibidos:', { productoId, vendedorId, cantidad });

    if (!productoId || !vendedorId || !cantidad) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Iniciar una transacción
    await query('BEGIN');

    try {
      // Insertar en la tabla transacciones
      const transactionResult = await query(
        'INSERT INTO transacciones (producto_id, cantidad, tipo, desde, hacia, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [productoId, cantidad, 'Entrega', decoded.id, vendedorId, new Date()]
      );
      console.log('Transacción insertada:', transactionResult.rows[0]);

      // Actualizar la tabla productos
      const updateProductResult = await query(
        'UPDATE productos SET cantidad = cantidad - $1 WHERE id = $2 RETURNING *',
        [cantidad, productoId]
      );
      console.log('Producto actualizado:', updateProductResult.rows[0]);

      // Insertar o actualizar la tabla usuario_productos
      const upsertResult = await query(
        `INSERT INTO usuario_productos (usuario_id, producto_id, cantidad) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (usuario_id, producto_id) 
         DO UPDATE SET cantidad = usuario_productos.cantidad + $3
         RETURNING *`,
        [vendedorId, productoId, cantidad]
      );
      console.log('usuario_productos actualizado:', upsertResult.rows[0]);

      // Confirmar la transacción
      await query('COMMIT');

      return NextResponse.json({ message: 'Producto entregado exitosamente', transaction: transactionResult.rows[0] });
    } catch (error) {
      // Revertir la transacción si hay un error
      await query('ROLLBACK');
      console.error('Error durante la transacción:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error al entregar producto:', error);
    return NextResponse.json({ error: 'Error al entregar producto', details: (error as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vendedorId = searchParams.get('vendedorId');

  if (!vendedorId) {
    return NextResponse.json({ error: 'Se requiere el ID del vendedor' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT t.id, p.nombre as producto, t.cantidad, t.tipo, t.desde, t.hacia, t.fecha
       FROM transacciones t 
       JOIN productos p ON t.producto_id = p.id 
       WHERE t.hacia = $1 
       ORDER BY t.fecha DESC`,
      [vendedorId]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones', details: (error as Error).message }, { status: 500 });
  }
}