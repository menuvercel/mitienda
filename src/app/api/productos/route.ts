import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const nombre = formData.get('nombre') as string;
  const precio = formData.get('precio') as string;
  const cantidad = formData.get('cantidad') as string;
  const foto = formData.get('foto') as File | null;

  let fotoUrl = '';

  if (foto && foto instanceof File) {
    const blob = await put(foto.name, foto, {
      access: 'public',
    });
    fotoUrl = blob.url;
  }

  const result = await query(
    'INSERT INTO productos (nombre, precio, cantidad, foto) VALUES ($1, $2, $3, $4) RETURNING *',
    [nombre, Number(precio), Number(cantidad), fotoUrl]
  );

  return NextResponse.json(result.rows[0]);
}

export async function GET() {
  const result = await query('SELECT * FROM productos');
  return NextResponse.json(result.rows);
}