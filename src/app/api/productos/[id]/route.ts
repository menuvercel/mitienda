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
  console.log('DELETE function called');
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded || decoded.rol !== 'Almacen') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    console.log('Attempting to delete product with ID:', id);

    // Check if the product exists before deleting
    const checkProduct = await query('SELECT * FROM productos WHERE id = $1', [id]);
    
    if (checkProduct.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Check for any foreign key constraints (corrected query)
    const checkConstraints = await query(`
      SELECT conname, conrelid::regclass AS table_name, a.attname AS column_name
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
      WHERE c.confrelid = 'productos'::regclass AND c.confkey::smallint[] @> ARRAY[1]::smallint[]
    `);

    console.log('Foreign key constraints:', checkConstraints.rows);

    // Start a transaction
    await query('BEGIN');

    try {
      if (checkConstraints.rows.length > 0) {
        for (const constraint of checkConstraints.rows) {
          await query(`DELETE FROM ${constraint.table_name} WHERE ${constraint.column_name} = $1`, [id]);
        }
      }

      const result = await query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);

      if (result.rowCount === 0) {
        throw new Error('No se pudo eliminar el producto');
      }

      // Commit the transaction
      await query('COMMIT');

      return NextResponse.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
      // Rollback the transaction in case of error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in DELETE function:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    const result = await query(
      `SELECT up.producto_id as id, p.nombre, p.precio, up.cantidad, p.foto
       FROM usuario_productos up
       JOIN productos p ON up.producto_id = p.id
       WHERE up.usuario_id = $1`,
      [id]
    );

    console.log('Raw query result:', result);
    console.log('Productos del vendedor:', result.rows);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}