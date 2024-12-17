import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Se requiere el ID del usuario' }, { status: 400 });
    }

    const result = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = result.rows[0];
    return NextResponse.json({
      ...user,
      id: user.id.toString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener la información del usuario' }, { status: 500 });
  }
}
