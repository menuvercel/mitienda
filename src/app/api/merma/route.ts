import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    const { producto_id, usuario_id, cantidad } = await request.json();

    // 1. Obtener información del producto y usuario
    const producto = await sql`
      SELECT * FROM productos WHERE id = ${producto_id}
    `;
    const usuario = await sql`
      SELECT * FROM usuarios WHERE id = ${usuario_id}
    `;

    if (!producto.rows[0] || !usuario.rows[0]) {
      return NextResponse.json(
        { error: 'Producto o usuario no encontrado' },
        { status: 404 }
      );
    }

    // 2. Crear registro en la tabla de merma
    await sql`
      INSERT INTO merma (
        producto_id,
        producto_nombre,
        cantidad,
        usuario_id,
        usuario_nombre
      ) VALUES (
        ${producto_id},
        ${producto.rows[0].nombre},
        ${cantidad},
        ${usuario_id},
        ${usuario.rows[0].nombre}
      )
    `;

    // 3. Actualizar la cantidad del producto
    await sql`
      UPDATE productos 
      SET cantidad = cantidad - ${cantidad}
      WHERE id = ${producto_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en merma:', error);
    return NextResponse.json(
      { error: 'Error al procesar la merma' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');

    const mermas = usuario_id
      ? await sql`
          SELECT 
            m.*,
            p.nombre,
            p.precio,
            p.tiene_parametros
          FROM merma m
          INNER JOIN productos p ON m.producto_id = p.id
          WHERE m.usuario_id = ${usuario_id} 
          ORDER BY m.fecha DESC`
      : await sql`
          SELECT 
            m.*,
            p.nombre,
            p.precio,
            p.tiene_parametros
          FROM merma m
          INNER JOIN productos p ON m.producto_id = p.id
          ORDER BY m.fecha DESC`;

    const mermasFormateadas = mermas.rows.map(merma => ({
      id: merma.id,
      cantidad: merma.cantidad,
      fecha: merma.fecha,
      usuario_id: merma.usuario_id,
      usuario_nombre: merma.usuario_nombre,
      producto: {
        id: merma.producto_id,
        nombre: merma.nombre,
        precio: merma.precio,
        tiene_parametros: merma.tiene_parametros
      }
    }));

    return NextResponse.json(mermasFormateadas);
  } catch (error) {
    console.error('Error al obtener mermas:', error);
    return NextResponse.json(
      { error: 'Error al obtener mermas' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get('producto_id');

    if (!productoId) {
      return NextResponse.json(
        { error: 'Se requiere producto_id' },
        { status: 400 }
      );
    }

    const resultado = await sql`
      DELETE FROM merma 
      WHERE producto_id = ${productoId}
    `;

    return NextResponse.json({ 
      success: true,
      message: 'Mermas eliminadas correctamente',
      registrosEliminados: resultado.rowCount
    });

  } catch (error) {
    console.error('Error al eliminar mermas:', error);
    return NextResponse.json(
      { error: 'Error al eliminar las mermas' },
      { status: 500 }
    );
  }
}


