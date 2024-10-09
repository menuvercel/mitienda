import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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

    const result = await query(
      `SELECT e.id, p.nombre as producto, e.cantidad, e.fecha, u.nombre as vendedor
       FROM entregas e
       JOIN productos p ON e.producto_id = p.id
       JOIN usuarios u ON e.vendedor_id = u.id
       WHERE e.vendedor_id = $1
       ORDER BY e.fecha DESC`,
      [vendedorId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener entregas:', error);
    return NextResponse.json({ error: 'Error al obtener entregas', details: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    await query('BEGIN');

    try {
      // Insertar en la tabla entregas
      const entregaResult = await query(
        'INSERT INTO entregas (producto_id, vendedor_id, cantidad, fecha) VALUES ($1, $2, $3, $4) RETURNING *',
        [productoId, vendedorId, cantidad, new Date()]
      );

      // Actualizar la tabla productos
      await query(
        'UPDATE productos SET cantidad = cantidad - $1 WHERE id = $2',
        [cantidad, productoId]
      );

      // Insertar o actualizar la tabla usuario_productos
      await query(
        `INSERT INTO usuario_productos (usuario_id, producto_id, cantidad) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (usuario_id, producto_id) 
         DO UPDATE SET cantidad = usuario_productos.cantidad + $3`,
        [vendedorId, productoId, cantidad]
      );

      await query('COMMIT');

      return NextResponse.json({ message: 'Entrega registrada exitosamente', entrega: entregaResult.rows[0] });
    } catch (error) {
      await query('ROLLBACK');
      console.error('Error durante la transacción:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error al registrar entrega:', error);
    return NextResponse.json({ error: 'Error al registrar entrega', details: (error as Error).message }, { status: 500 });
  }
}