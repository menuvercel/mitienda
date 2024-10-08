import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getVendedores } from '@/db/usuarios';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const vendedores = await getVendedores();
    return NextResponse.json(vendedores);
  } catch (error) {
    console.error('Error al obtener vendedores:', error);
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 });
  }
}