import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Parametro, Merma } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { producto_id, usuario_id, cantidad, parametros } = await request.json();

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

    // 2. Crear registro en la tabla merma
    const mermaResult = await sql`
      INSERT INTO merma (
        producto_id,
        producto_nombre,
        cantidad,
        fecha,
        usuario_id,
        usuario_nombre
      ) VALUES (
        ${producto_id},
        ${producto.rows[0].nombre},
        ${cantidad},
        NOW(),
        ${usuario_id},
        ${usuario.rows[0].nombre}
      )
      RETURNING id
    `;

    const mermaId = mermaResult.rows[0].id;

    const isAlmacen = usuario.rows[0].rol === 'Almacen' || String(usuario_id) === '1';

    if (producto.rows[0].tiene_parametros && parametros && parametros.length > 0) {
      // 3a. Para productos con parámetros
      const transaccionResult = await sql`
        INSERT INTO transacciones (
          producto,
          cantidad,
          desde,
          hacia,
          fecha,
          tipo
        ) VALUES (
          ${producto_id},
          ${cantidad},
          ${usuario_id},
          'MERMA',
          NOW(),
          'Baja'
        )
        RETURNING id
      `;

      const transaccionId = transaccionResult.rows[0].id;

      for (const param of parametros) {
        // Registrar en merma_parametros
        await sql`
          INSERT INTO merma_parametros (
            merma_id,
            nombre,
            cantidad
          ) VALUES (
            ${mermaId},
            ${param.nombre},
            ${param.cantidad}
          )
        `;

        // Registrar en transaccion_parametros
        await sql`
          INSERT INTO transaccion_parametros (
            transaccion_id,
            nombre,
            cantidad
          ) VALUES (
            ${transaccionId},
            ${param.nombre},
            ${param.cantidad}
          )
        `;

        // Actualizar inventario según origen
        if (isAlmacen) {
          await sql`
            UPDATE producto_parametros
            SET cantidad = GREATEST(cantidad - ${param.cantidad}, 0)
            WHERE producto_id = ${producto_id}
            AND nombre = ${param.nombre}
          `;
        } else {
          await sql`
            UPDATE usuario_producto_parametros
            SET cantidad = GREATEST(cantidad - ${param.cantidad}, 0)
            WHERE usuario_id = ${usuario_id}
            AND producto_id = ${producto_id}
            AND nombre = ${param.nombre}
          `;
        }
      }

      if (isAlmacen) {
        const totalParametros = parametros.reduce((sum: number, p: any) => sum + (Number(p.cantidad) || 0), 0);
        await sql`
          UPDATE productos 
          SET cantidad = GREATEST(cantidad - ${totalParametros}, 0)
          WHERE id = ${producto_id}
        `;
      } else {
        // Verificar si se agotó para cerrar vigencia
        await sql`
          UPDATE usuario_productos
          SET 
            vigencia_fin = CASE WHEN cantidad <= 0 AND vigencia_fin IS NULL THEN NOW() ELSE vigencia_fin END,
            vigencia = CASE WHEN cantidad <= 0 THEN ROUND(GREATEST(EXTRACT(EPOCH FROM (NOW() - COALESCE(vigencia_inicio, NOW()))) / 86400.0, 0.1)::numeric, 1) ELSE vigencia END
          WHERE usuario_id = ${usuario_id} AND producto_id = ${producto_id}
        `;
      }
    } else {
      // 3b. Para productos sin parámetros
      await sql`
        INSERT INTO transacciones (
          producto,
          cantidad,
          desde,
          hacia,
          fecha,
          tipo
        ) VALUES (
          ${producto_id},
          ${cantidad},
          ${usuario_id},
          'MERMA',
          NOW(),
          'Baja'
        )
      `;

      // Actualizar inventario según origen
      if (isAlmacen) {
        await sql`
          UPDATE productos 
          SET cantidad = GREATEST(cantidad - ${cantidad}, 0)
          WHERE id = ${producto_id}
        `;
      } else {
        await sql`
          UPDATE usuario_productos 
          SET cantidad = GREATEST(cantidad - ${cantidad}, 0),
              vigencia_fin = CASE WHEN (cantidad - ${cantidad}) <= 0 AND vigencia_fin IS NULL THEN NOW() ELSE vigencia_fin END,
              vigencia = CASE WHEN (cantidad - ${cantidad}) <= 0 THEN ROUND(GREATEST(EXTRACT(EPOCH FROM (NOW() - COALESCE(vigencia_inicio, NOW()))) / 86400.0, 0.1)::numeric, 1) ELSE vigencia END
          WHERE usuario_id = ${usuario_id}
          AND producto_id = ${producto_id}
        `;
      }
    }

    return NextResponse.json({ success: true, merma_id: mermaId });
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

    // Consulta base para obtener las mermas
    const mermas = await sql`
      SELECT 
        m.id,
        m.producto_id,
        m.producto_nombre,
        m.cantidad,
        m.fecha,
        m.usuario_id,
        m.usuario_nombre,
        p.precio,
        p.foto,
        p.tiene_parametros
      FROM merma m
      INNER JOIN productos p ON m.producto_id = p.id
      WHERE CASE 
        WHEN ${usuario_id}::text IS NOT NULL THEN m.usuario_id = ${usuario_id}
        ELSE TRUE
      END
      ORDER BY m.fecha DESC
    `;

    // Get all merma IDs that have parameters to fetch them in one go
    const mermaIdsWithParams = mermas.rows
      .filter(m => m.tiene_parametros)
      .map(m => m.id);

    let allParametros: any[] = [];
    if (mermaIdsWithParams.length > 0) {
      // Fetch all parameters for these mermas at once
      const parametrosResult = await sql.query(
        `SELECT 
          merma_id,
          nombre,
          cantidad
        FROM merma_parametros
        WHERE merma_id = ANY ($1)`,
        [mermaIdsWithParams]
      );
      allParametros = parametrosResult.rows;
    }

    const mermasFormateadas = mermas.rows.map(merma => {
      const parametros = allParametros
        .filter(p => p.merma_id === merma.id)
        .map(p => ({
          nombre: p.nombre,
          cantidad: p.cantidad
        }));

      return {
        id: merma.id,
        cantidad: merma.cantidad,
        fecha: merma.fecha,
        usuario_id: merma.usuario_id,
        producto: {
          id: merma.producto_id,
          nombre: merma.producto_nombre,
          precio: merma.precio,
          foto: merma.foto,
          tiene_parametros: merma.tiene_parametros,
          parametros: parametros
        }
      };
    });

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
    const producto_id = searchParams.get('producto_id');

    if (!producto_id) {
      return NextResponse.json(
        { error: 'Producto ID es requerido' },
        { status: 400 }
      );
    }

    // 1. Eliminar los registros de merma_parametros
    await sql`
      DELETE FROM merma_parametros
      WHERE merma_id IN (
        SELECT id FROM merma WHERE producto_id = ${producto_id}
      )
    `;

    // 2. Eliminar los registros de merma
    await sql`
      DELETE FROM merma
      WHERE producto_id = ${producto_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar mermas:', error);
    return NextResponse.json(
      { error: 'Error al eliminar mermas' },
      { status: 500 }
    );
  }
}


