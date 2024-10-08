import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE rol = $1', ['Vendedor']);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener vendedores:', error);
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 });
  }
}