import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Parametro, Merma } from '@/types';

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

    // 2. Crear registro en la tabla de transacciones
    const transaccionResult = await sql`
      INSERT INTO transacciones (
        producto,
        cantidad,
        tipo,
        desde,
        hacia,
        fecha
      ) VALUES (
        ${producto_id},
        ${cantidad},
        'Baja',
        ${usuario_id},
        null,
        NOW()
      )
      RETURNING id
    `;

    const transaccionId = transaccionResult.rows[0].id;

    // 3. Si hay parámetros, guardarlos en transaccion_parametros y actualizar usuario_producto_parametros
    if (producto.rows[0].tiene_parametros && parametros && parametros.length > 0) {
      for (const param of parametros) {
        // Insertar en transaccion_parametros
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

        // Actualizar usuario_producto_parametros
        await sql`
          UPDATE usuario_producto_parametros
          SET cantidad = cantidad - ${param.cantidad}
          WHERE usuario_id = ${usuario_id}
          AND producto_id = ${producto_id}
          AND nombre = ${param.nombre}
        `;
      }
    } else if (!producto.rows[0].tiene_parametros) {
      // 4. Si no tiene parámetros, actualizar la cantidad en usuario_productos
      await sql`
        UPDATE usuario_productos 
        SET cantidad = cantidad - ${cantidad}
        WHERE usuario_id = ${usuario_id}
        AND producto_id = ${producto_id}
      `;
    }

    return NextResponse.json({ success: true, transaccion_id: transaccionId });
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

    // Consulta base para obtener las mermas desde transacciones
    const mermas = await sql`
      WITH MermasTotales AS (
        SELECT 
          p.id as producto_id,
          p.nombre,
          p.precio,
          p.cantidad as cantidad_producto,
          p.foto,
          p.tiene_parametros,
          COALESCE(
            SUM(CASE 
              WHEN p.tiene_parametros THEN (
                SELECT SUM(tp.cantidad)
                FROM transaccion_parametros tp
                WHERE tp.transaccion_id = t.id
              )
              ELSE t.cantidad
            END),
            0
          ) as cantidad_total,
          MAX(t.fecha) as ultima_fecha
        FROM transacciones t
        INNER JOIN productos p ON t.producto = p.id
        WHERE t.tipo = 'Baja'
        AND CASE 
          WHEN ${usuario_id}::text IS NOT NULL THEN t.desde = ${usuario_id}
          ELSE TRUE
        END
        GROUP BY p.id, p.nombre, p.precio, p.cantidad, p.foto, p.tiene_parametros
      )
      SELECT * FROM MermasTotales
      ORDER BY ultima_fecha DESC
    `;

    const mermasFormateadas = await Promise.all(mermas.rows.map(async merma => {
      let parametros: Parametro[] = [];

      if (merma.tiene_parametros) {
        // Obtener la suma de parámetros desde transaccion_parametros
        const parametrosResult = await sql`
          SELECT 
            tp.nombre,
            SUM(tp.cantidad) as cantidad
          FROM transaccion_parametros tp
          INNER JOIN transacciones t ON tp.transaccion_id = t.id
          WHERE t.producto = ${merma.producto_id}
          AND t.tipo = 'Baja'
          AND CASE 
            WHEN ${usuario_id}::text IS NOT NULL THEN t.desde = ${usuario_id}
            ELSE TRUE
          END
          GROUP BY tp.nombre
        `;
        parametros = parametrosResult.rows.map(row => ({
          nombre: row.nombre,
          cantidad: row.cantidad
        }));
      }

      return {
        id: merma.producto_id,
        cantidad: merma.cantidad_total,
        fecha: merma.ultima_fecha,
        usuario_id: usuario_id || null,
        producto: {
          id: merma.producto_id,
          nombre: merma.nombre,
          precio: merma.precio,
          cantidad: merma.cantidad_producto,
          foto: merma.foto,
          tiene_parametros: merma.tiene_parametros,
          parametros: parametros
        }
      };
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

    // Primero obtener los IDs de las transacciones de tipo merma
    const transacciones = await sql`
      SELECT id FROM transacciones 
      WHERE producto = ${productoId}
      AND tipo = 'Baja'
    `;

    // Eliminar los parámetros relacionados
    for (const transaccion of transacciones.rows) {
      await sql`
        DELETE FROM transaccion_parametros 
        WHERE transaccion_id = ${transaccion.id}
      `;
    }

    // Luego eliminar las transacciones
    const resultado = await sql`
      DELETE FROM transacciones 
      WHERE producto = ${productoId}
      AND tipo = 'Baja'
    `;

    return NextResponse.json({
      success: true,
      message: 'Registros de merma eliminados correctamente',
      registrosEliminados: resultado.rowCount
    });

  } catch (error) {
    console.error('Error al eliminar registros de merma:', error);
    return NextResponse.json(
      { error: 'Error al eliminar los registros de merma' },
      { status: 500 }
    );
  }
}
