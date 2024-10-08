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

    console.log('Received transaction data:', { productoId, vendedorId, cantidad });

    if (!productoId || !vendedorId || !cantidad) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Start a transaction
    await query('BEGIN');

    try {
      // Insert into transacciones table
      const transactionResult = await query(
        'INSERT INTO transacciones (producto, cantidad, precio, desde, hacia, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [productoId, cantidad, 0, decoded.id, vendedorId, new Date()]
      );
      console.log('Transaction inserted:', transactionResult.rows[0]);

      // Update productos table
      const updateProductResult = await query(
        'UPDATE productos SET cantidad = cantidad - $1 WHERE id = $2 RETURNING *',
        [cantidad, productoId]
      );
      console.log('Product updated:', updateProductResult.rows[0]);

      // Insert or update usuario_productos table
      const upsertResult = await query(
        `INSERT INTO usuario_productos (usuario_id, producto_id, cantidad) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (usuario_id, producto_id) 
         DO UPDATE SET cantidad = usuario_productos.cantidad + $3
         RETURNING *`,
        [vendedorId, productoId, cantidad]
      );
      console.log('Usuario_productos updated:', upsertResult.rows[0]);

      // Commit the transaction
      await query('COMMIT');

      return NextResponse.json({ message: 'Producto entregado exitosamente', transaction: transactionResult.rows[0] });
    } catch (error) {
      // Rollback the transaction if there's an error
      await query('ROLLBACK');
      console.error('Error during transaction:', error);
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
    // Update this query
    const result = await query(
      'SELECT t.*, p.nombre as producto_nombre FROM transacciones t JOIN productos p ON t.producto = p.id WHERE t.hacia = $1 ORDER BY t.fecha DESC',
      [vendedorId]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones', details: (error as Error).message }, { status: 500 });
  }
}