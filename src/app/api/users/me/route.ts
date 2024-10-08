import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { findUsuarioById } from '@/db/usuarios';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const user = await findUsuarioById((decoded as { id: string }).id);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    // Excluye la contraseña de la respuesta
    const { password, ...userWithoutPassword } = user.toObject();
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 });
  }
}