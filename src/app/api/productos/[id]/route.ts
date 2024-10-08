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

    console.log('Received form data:', { id, nombre, precio, cantidad, foto });

    // Fetch the current product data
    const currentProduct = await query('SELECT * FROM productos WHERE id = $1', [id]);
    
    if (currentProduct.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    let fotoUrl = currentProduct.rows[0].foto; // Keep the existing photo URL by default

    if (foto && foto instanceof File) {
      try {
        console.log('Uploading new image:', foto.name);
        const blob = await put(foto.name, foto, {
          access: 'public',
        });
        fotoUrl = blob.url;
        console.log('New image uploaded successfully:', fotoUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
      }
    } else {
      console.log('No new image file received, keeping existing image URL:', fotoUrl);
    }

    const result = await query(
      'UPDATE productos SET nombre = $1, precio = $2, cantidad = $3, foto = $4 WHERE id = $5 RETURNING *',
      [nombre, Number(precio), Number(cantidad), fotoUrl, id]
    );

    console.log('Product updated:', result.rows[0]);

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

    console.log('Attempting to delete product with ID:', id);

    const result = await query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);

    console.log('Delete query result:', result);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: (error as Error).message }, { status: 500 });
  }
}