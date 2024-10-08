import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { put } from '@vercel/blob';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded || decoded.rol !== 'Almacen') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const formData = await request.formData();
    const nombre = formData.get('nombre') as string;
    const precio = formData.get('precio') as string;
    const cantidad = formData.get('cantidad') as string;
    const foto = formData.get('foto') as File | null;

    let fotoUrl = formData.get('fotoUrl') as string;

    if (foto && foto instanceof File) {
      try {
        const blob = await put(foto.name, foto, {
          access: 'public',
        });
        fotoUrl = blob.url;
      } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
      }
    }

    const result = await query(
      'UPDATE productos SET nombre = $1, precio = $2, cantidad = $3, foto = $4 WHERE id = $5 RETURNING *',
      [nombre, Number(precio), Number(cantidad), fotoUrl, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded || decoded.rol !== 'Almacen') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    const result = await query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}