import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const decoded = verifyToken(token);
    
    if (!decoded || typeof decoded !== 'object' || !('id' in decoded)) {
      throw new Error('Token inválido');
    }

    const result = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = result.rows[0];
    return NextResponse.json({
      ...user,
      id: user.id.toString() // Ensure ID is always a string
    });
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    if (error instanceof Error && error.message === 'Token inválido') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al obtener la información del usuario' }, { status: 500 });
  }
}