import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE id = $1', [(decoded as { id: string }).id]);
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 });
  }
}