import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';



export async function POST(request: NextRequest) {
    try {
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
  
      console.log('Received form data:', { nombre, precio, cantidad, foto });
  
      let fotoUrl = '';
  
      if (foto && foto instanceof File) {
        try {
          console.log('Uploading image:', foto.name);
          const blob = await put(foto.name, foto, {
            access: 'public',
          });
          fotoUrl = blob.url;
          console.log('Image uploaded successfully:', fotoUrl);
        } catch (error) {
          console.error('Error uploading image:', error);
          return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
        }
      } else {
        console.log('No image file received');
      }
  
      const result = await query(
        'INSERT INTO productos (nombre, precio, cantidad, foto) VALUES ($1, $2, $3, $4) RETURNING *',
        [nombre, Number(precio), Number(cantidad), fotoUrl]
      );
  
      console.log('Product inserted:', result.rows[0]);
  
      return NextResponse.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }


  export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token);
    
    if (!decoded || (decoded as { rol: string }).rol !== 'Vendedor') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  
    const vendedorId = params.id;
  
    try {
      const result = await query(
        `SELECT p.id, p.nombre, p.precio, p.foto, up.cantidad
         FROM productos p
         JOIN usuario_productos up ON p.id = up.producto_id
         WHERE up.usuario_id = $1`,
        [vendedorId]
      );
      
      return NextResponse.json(result.rows);
    } catch (error) {
      console.error('Error al obtener productos del vendedor:', error);
      return NextResponse.json({ error: 'Error al obtener productos del vendedor' }, { status: 500 });
    }
  }