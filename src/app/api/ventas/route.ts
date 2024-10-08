import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded || decoded.rol !== 'Vendedor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { productoId, cantidad, fecha } = body;

  if (!productoId || !cantidad || !fecha) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  try {
    // Update this query
    const productResult = await query('SELECT precio FROM productos WHERE id = $1', [productoId]);
    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    const precioUnitario = productResult.rows[0].precio;

    // Update this query
    const result = await query(
      'INSERT INTO ventas (producto, cantidad, precio_unitario, total, vendedor, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [productoId, cantidad, precioUnitario, precioUnitario * cantidad, decoded.id, new Date(fecha)]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear venta:', error);
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 });
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
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!vendedorId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Se requieren vendedorId, startDate y endDate' }, { status: 400 });
  }

  try {
    // Update this query
    const result = await query(
      `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto
       FROM ventas v
       JOIN productos p ON v.producto = p.id
       WHERE v.vendedor = $1 AND v.fecha BETWEEN $2 AND $3
       ORDER BY v.fecha DESC`,
      [vendedorId, startDate, endDate]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ error: 'Error al obtener ventas', details: (error as Error).message }, { status: 500 });
  }
}