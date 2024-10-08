import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Vendedor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { productoId, cantidad, fecha } = body;

  try {
    const result = await query(
      'INSERT INTO ventas (producto_id, cantidad, precio_unitario, total, vendedor_id, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [productoId, cantidad, 0, 0, (decoded as { id: string }).id, new Date(fecha)]
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
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Se requieren fechas de inicio y fin' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto
       FROM ventas v
       JOIN productos p ON v.producto_id = p.id
       WHERE v.vendedor_id = $1 AND v.fecha BETWEEN $2 AND $3`,
      [decoded.id, new Date(startDate), new Date(endDate)]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}