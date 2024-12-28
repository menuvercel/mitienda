import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, fromVendorId, toVendorId, cantidad } = body;

    if (!productId || !fromVendorId || !toVendorId || !cantidad) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    await query('BEGIN');

    try {
      // 1. Verificar stock del vendedor origen
      const vendedorProductoResult = await query(
        'SELECT cantidad, precio FROM usuario_productos WHERE usuario_id = $1 AND producto_id = $2',
        [fromVendorId, productId]
      );

      if (vendedorProductoResult.rows.length === 0) {
        throw new Error('El vendedor origen no tiene este producto');
      }

      const { cantidad: stockVendedor, precio } = vendedorProductoResult.rows[0];

      if (stockVendedor < cantidad) {
        throw new Error('Stock insuficiente en vendedor origen');
      }

      // 2. Verificar si el producto tiene parámetros
      const productoResult = await query(
        'SELECT tiene_parametros FROM productos WHERE id = $1',
        [productId]
      );

      const { tiene_parametros } = productoResult.rows[0];

      // 3. Registrar las transacciones
      // Transacción de Baja para el vendedor origen (desde = fromVendorId, hacia = fromVendorId)
      const bajaResult = await query(
        'INSERT INTO transacciones (producto, cantidad, tipo, desde, hacia, fecha) VALUES ($1, $2, $3, $4, $4, $5) RETURNING *',
        [productId, cantidad, 'Baja', fromVendorId, new Date()]
      );

      // Transacción de Entrega para el vendedor destino (desde = toVendorId, hacia = toVendorId)
      const entregaResult = await query(
        'INSERT INTO transacciones (producto, cantidad, tipo, desde, hacia, fecha) VALUES ($1, $2, $3, $4, $4, $5) RETURNING *',
        [productId, cantidad, 'Entrega', toVendorId, new Date()]
      );

      // 4. Actualizar stock del vendedor origen
      await query(
        'UPDATE usuario_productos SET cantidad = cantidad - $1 WHERE usuario_id = $2 AND producto_id = $3',
        [cantidad, fromVendorId, productId]
      );

      // 5. Actualizar o crear stock del vendedor destino
      await query(
        `INSERT INTO usuario_productos (usuario_id, producto_id, cantidad, precio) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (usuario_id, producto_id) 
         DO UPDATE SET cantidad = usuario_productos.cantidad + $3`,
        [toVendorId, productId, cantidad, precio]
      );

      // 6. Si tiene parámetros, transferir también los parámetros
      if (tiene_parametros) {
        const parametrosResult = await query(
          'SELECT nombre, cantidad as param_cantidad FROM usuario_producto_parametros WHERE usuario_id = $1 AND producto_id = $2',
          [fromVendorId, productId]
        );

        for (const param of parametrosResult.rows) {
          const cantidadParametro = (param.param_cantidad / stockVendedor) * cantidad;

          // Reducir parámetros del vendedor origen
          await query(
            'UPDATE usuario_producto_parametros SET cantidad = cantidad - $1 WHERE usuario_id = $2 AND producto_id = $3 AND nombre = $4',
            [cantidadParametro, fromVendorId, productId, param.nombre]
          );

          // Agregar o actualizar parámetros en vendedor destino
          await query(
            `INSERT INTO usuario_producto_parametros (usuario_id, producto_id, nombre, cantidad)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (usuario_id, producto_id, nombre)
             DO UPDATE SET cantidad = usuario_producto_parametros.cantidad + $4`,
            [toVendorId, productId, param.nombre, cantidadParametro]
          );
        }
      }

      await query('COMMIT');

      return NextResponse.json({
        message: 'Transferencia completada exitosamente',
        transactions: {
          baja: bajaResult.rows[0],
          entrega: entregaResult.rows[0]
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Error en la transferencia', details: error.message },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: 'Error desconocido en la transferencia' },
        { status: 500 }
      );
    }
  }
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromVendorId = searchParams.get('fromVendorId');
  const toVendorId = searchParams.get('toVendorId');

  if (!fromVendorId && !toVendorId) {
    return NextResponse.json(
      { error: 'Se requiere al menos un ID de vendedor' },
      { status: 400 }
    );
  }

  try {
    let result;
    if (fromVendorId && toVendorId) {
      // Buscar todas las transacciones relacionadas entre estos dos vendedores
      result = await query(
        `SELECT t.id, p.nombre as producto, t.cantidad, t.tipo, t.desde, t.hacia, t.fecha, p.precio
         FROM transacciones t 
         JOIN productos p ON t.producto = p.id 
         WHERE (t.desde = $1 AND t.hacia = $2) OR (t.desde = $2 AND t.hacia = $1)
         ORDER BY t.fecha DESC`,
        [fromVendorId, toVendorId]
      );
    } else {
      // Buscar todas las transacciones de un vendedor específico
      const vendorId = fromVendorId || toVendorId;
      result = await query(
        `SELECT t.id, p.nombre as producto, t.cantidad, t.tipo, t.desde, t.hacia, t.fecha, p.precio
         FROM transacciones t 
         JOIN productos p ON t.producto = p.id 
         WHERE t.desde = $1 OR t.hacia = $1
         ORDER BY t.fecha DESC`,
        [vendorId]
      );
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Error al obtener transacciones', details: error.message },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: 'Error desconocido al obtener transacciones' },
        { status: 500 }
      );
    }
  }
}
