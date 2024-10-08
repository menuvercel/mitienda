import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import dbConnect from '@/lib/db';
import { createProducto, getAllProductos } from '@/db/producto';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  await dbConnect();

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

  const producto = await createProducto({
    nombre,
    precio: Number(precio),
    cantidad: Number(cantidad),
    foto: fotoUrl
  });

  return NextResponse.json(producto);
}

export async function GET() {
  await dbConnect();

  const productos = await getAllProductos();

  return NextResponse.json(productos);
}