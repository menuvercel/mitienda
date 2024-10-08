import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const decoded = verifyToken(token);
    
    if (!decoded || typeof decoded !== 'object' || !('id' in decoded)) {
      throw new Error('Token inválido');
    }

    const vendedorId = params.id;
    const result = await query('SELECT p.* FROM productos p JOIN usuario_productos up ON p.id = up.producto_id WHERE up.usuario_id = $1', [vendedorId]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos del vendedor:', error);
    return NextResponse.json({ error: 'Error al obtener productos del vendedor' }, { status: 500 });
  }
}