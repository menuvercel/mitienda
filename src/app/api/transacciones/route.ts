import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
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

  try {
    const result = await query(
      'INSERT INTO transacciones (producto_id, cantidad, precio, desde, hacia, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [productoId, cantidad, 0, decoded.id, vendedorId, new Date()]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear transacción:', error);
    return NextResponse.json({ error: 'Error al crear transacción' }, { status: 500 });
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
      'SELECT t.*, p.nombre as producto_nombre FROM transacciones t JOIN productos p ON t.producto_id = p.id WHERE t.hacia = $1 ORDER BY t.fecha DESC',
      [vendedorId]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
  }
}