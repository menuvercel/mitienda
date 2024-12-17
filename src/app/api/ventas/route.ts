import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded || decoded.rol !== 'Vendedor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { productoId, cantidad, fecha, parametros } = body;

  if (!productoId || !cantidad || !fecha) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  try {
    const fechaVenta = new Date(fecha);
    await query('BEGIN');

    // Verificar si el producto tiene parámetros
    const productoResult = await query(
      `SELECT p.precio, p.tiene_parametros, up.cantidad as stock_vendedor 
       FROM productos p 
       JOIN usuario_productos up ON p.id = up.producto_id 
       WHERE p.id = $1 AND up.usuario_id = $2`,
      [productoId, decoded.id]
    );

    if (productoResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Producto no encontrado o no asignado al vendedor' }, { status: 404 });
    }

    const { precio: precioUnitario, stock_vendedor, tiene_parametros } = productoResult.rows[0];

    // Verificar stock según si tiene parámetros o no
    if (tiene_parametros && parametros) {
      // Verificar stock para cada parámetro
      for (const param of parametros) {
        const stockParam = await query(
          `SELECT cantidad FROM usuario_producto_parametros 
           WHERE usuario_id = $1 AND producto_id = $2 AND nombre = $3`,
          [decoded.id, productoId, param.nombre]
        );

        if (stockParam.rows[0].cantidad < param.cantidad) {
          await query('ROLLBACK');
          return NextResponse.json({ 
            error: `Stock insuficiente para el parámetro ${param.nombre}` 
          }, { status: 400 });
        }
      }
    } else if (!tiene_parametros && stock_vendedor < cantidad) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
    }

    // Actualizar stock
    if (tiene_parametros && parametros) {
      for (const param of parametros) {
        await query(
          `UPDATE usuario_producto_parametros 
           SET cantidad = cantidad - $1 
           WHERE usuario_id = $2 AND producto_id = $3 AND nombre = $4`,
          [param.cantidad, decoded.id, productoId, param.nombre]
        );
      }
    } else {
      await query(
        'UPDATE usuario_productos SET cantidad = cantidad - $1 WHERE producto_id = $2 AND usuario_id = $3',
        [cantidad, productoId, decoded.id]
      );
    }

    // Crear venta
    const ventaResult = await query(
      `INSERT INTO ventas (producto, cantidad, precio_unitario, total, vendedor, fecha, parametros) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [productoId, cantidad, precioUnitario, precioUnitario * cantidad, decoded.id, fechaVenta, 
       parametros ? JSON.stringify(parametros) : null]
    );

    await query('COMMIT');
    return NextResponse.json(ventaResult.rows[0]);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error al crear venta:', error);
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vendedorId = searchParams.get('vendedorId');
  const productoId = searchParams.get('productoId');
  const ventaId = searchParams.get('id'); // Añadimos el parámetro id

  try {
    let result;
    
    // Si se proporciona un ID de venta específico
    if (ventaId) {
      result = await query(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.id = $1`,
        [ventaId]
      );

      // Si no se encuentra la venta
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]); // Retornamos solo la venta específica
    }
    
    // Lógica existente para filtrar por producto
    if (productoId) {
      result = await query(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.producto = $1
         ORDER BY v.fecha DESC`,
        [productoId]
      );
    } 
    // Lógica existente para filtrar por vendedor
    else if (vendedorId) {
      result = await query(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.vendedor = $1
         ORDER BY v.fecha DESC`,
        [vendedorId]
      );
    } 
    // Si no se proporciona ningún filtro
    else {
      return NextResponse.json({ error: 'Se requiere vendedorId, productoId o id' }, { status: 400 });
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ error: 'Error al obtener ventas', details: (error as Error).message }, { status: 500 });
  }
}