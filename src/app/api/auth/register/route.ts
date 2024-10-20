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
  const { nombre, password, telefono, rol } = body;

  try {
    const result = await query(
      'INSERT INTO usuarios (nombre, password, telefono, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, telefono, rol',
      [nombre, password, telefono, rol]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 });
  }
}