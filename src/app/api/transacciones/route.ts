import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;
    if (!decoded || decoded.rol !== 'Almacen') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { productoId, vendedorId, cantidad, tipo, parametros } = body;
    console.log('Datos de transacción recibidos:', { productoId, vendedorId, cantidad, tipo, parametros });

    if (!productoId || !vendedorId || !cantidad || !tipo) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    await query('BEGIN');

    try {
      // Verificar si el producto tiene parámetros
      const productoResult = await query(
        'SELECT tiene_parametros, cantidad as stock_actual FROM productos WHERE id = $1',
        [productoId]
      );

      if (productoResult.rows.length === 0) {
        throw new Error('Producto no encontrado');
      }

      const { tiene_parametros, stock_actual } = productoResult.rows[0];

      // Verificar stock disponible
      if (stock_actual < cantidad) {
        throw new Error('Stock insuficiente');
      }

      // Obtener el precio del producto
      const productResult = await query('SELECT precio FROM productos WHERE id = $1', [productoId]);
      const productPrice = productResult.rows[0]?.precio;
      
      if (!productPrice) {
        throw new Error('No se pudo obtener el precio del producto');
      }

      // Insertar transacción principal
      const transactionResult = await query(
        'INSERT INTO transacciones (producto, cantidad, tipo, desde, hacia, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [productoId, cantidad, tipo, decoded.id, vendedorId, new Date()]
      );
      
      // Actualizar la tabla productos
      await query(
        'UPDATE productos SET cantidad = cantidad - $1 WHERE id = $2',
        [cantidad, productoId]
      );
      
      // Insertar o actualizar la tabla usuario_productos
      await query(
        `INSERT INTO usuario_productos (usuario_id, producto_id, cantidad, precio) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (usuario_id, producto_id) 
         DO UPDATE SET cantidad = usuario_productos.cantidad + $3, precio = $4`,
        [vendedorId, productoId, cantidad, productPrice]
      );

      // Si el producto tiene parámetros, procesarlos
      if (tiene_parametros && parametros && parametros.length > 0) {
        for (const param of parametros) {
          // Verificar el stock del parámetro
          const paramStockResult = await query(
            'SELECT cantidad FROM producto_parametros WHERE producto_id = $1 AND nombre = $2',
            [productoId, param.nombre]
          );

          if (paramStockResult.rows[0].cantidad < (param.cantidad * cantidad)) {
            throw new Error(`Stock insuficiente para el parámetro ${param.nombre}`);
          }

          // Registrar la transacción del parámetro
          await query(
            'INSERT INTO transacciones (producto, cantidad, tipo, desde, hacia, fecha) VALUES ($1, $2, $3, $4, $5, $6)',
            [`${productoId}:${param.nombre}`, param.cantidad * cantidad, tipo, decoded.id, vendedorId, new Date()]
          );

          // Actualizar stock del parámetro en producto_parametros
          await query(
            'UPDATE producto_parametros SET cantidad = cantidad - $1 WHERE producto_id = $2 AND nombre = $3',
            [param.cantidad * cantidad, productoId, param.nombre]
          );

          // Insertar o actualizar parámetros en usuario_producto_parametros
          await query(
            `INSERT INTO usuario_producto_parametros (usuario_id, producto_id, nombre, cantidad)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (usuario_id, producto_id, nombre)
             DO UPDATE SET cantidad = usuario_producto_parametros.cantidad + $4`,
            [vendedorId, productoId, param.nombre, param.cantidad * cantidad]
          );
        }
      }

      await query('COMMIT');
      
      return NextResponse.json({ 
        message: 'Producto entregado exitosamente', 
        transaction: transactionResult.rows[0] 
      });

    } catch (error) {
      await query('ROLLBACK');
      console.error('Error durante la transacción:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error al entregar producto:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Error al entregar producto', details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Error desconocido al entregar producto' }, { status: 500 });
    }
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

  // Validación adicional para asegurarse de que los IDs son números válidos
  if ((!vendedorId || vendedorId.trim() === '') && (!productoId || productoId.trim() === '')) {
    return NextResponse.json({ error: 'Se requiere vendedorId o productoId válido' }, { status: 400 });
  }

  // Validar que los IDs son números
  if (vendedorId && !/^\d+$/.test(vendedorId)) {
    return NextResponse.json({ error: 'vendedorId debe ser un número' }, { status: 400 });
  }

  if (productoId && !/^\d+$/.test(productoId)) {
    return NextResponse.json({ error: 'productoId debe ser un número' }, { status: 400 });
  }

  try {
    const query_text = `
      SELECT 
        t.id,
        COALESCE(t.producto, '') as producto,
        COALESCE(t.cantidad, 0) as cantidad,
        COALESCE(t.tipo, '') as tipo,
        COALESCE(t.desde, '') as desde,
        COALESCE(t.hacia, '') as hacia,
        COALESCE(t.fecha, NOW()) as fecha,
        COALESCE(p.nombre, 'Producto Desconocido') as producto_nombre,
        COALESCE(p.tiene_parametros, false) as tiene_parametros,
        COALESCE(array_agg(pp.nombre) FILTER (WHERE pp.nombre IS NOT NULL), ARRAY[]::text[]) as nombres_parametros
      FROM transacciones t
      LEFT JOIN productos p ON CAST(split_part(t.producto::text, ':', 1) AS INTEGER) = p.id
      LEFT JOIN producto_parametros pp ON pp.producto_id = p.id
      WHERE ${productoId ? "split_part(t.producto::text, ':', 1) = $1" : "t.hacia = $1 OR t.desde = $1"}
      GROUP BY t.id, t.producto, t.cantidad, t.tipo, t.desde, t.hacia, t.fecha, p.nombre, p.tiene_parametros
      ORDER BY t.fecha DESC
    `;

    // Usar el ID validado
    const paramValue = productoId || vendedorId;
    if (!paramValue) {
      throw new Error('No se proporcionó un ID válido');
    }

    const result = await query(query_text, [paramValue]);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json([]);
    }

    const transformedRows = result.rows.map(row => {
      const productoStr = String(row.producto || '');
      const [productId = '', parametrosValores = ''] = productoStr.split(':');
      
      let nombreCompleto = String(row.producto_nombre || 'Producto Desconocido');
      
      const parametrosArray = Array.isArray(row.nombres_parametros) ? 
        row.nombres_parametros.filter(Boolean) : [];
      
      if (row.tiene_parametros && parametrosValores) {
        const valoresArray = parametrosValores.split(',').filter(Boolean);
        
        const parametrosFormateados = parametrosArray
          .map((nombre: string, index: number) => {
            if (!nombre) return '';
            const valor = valoresArray[index] || 'N/A';
            return `${nombre}: ${valor}`;
          })
          .filter(Boolean)
          .join(', ');
        
        if (parametrosFormateados) {
          nombreCompleto += ` (${parametrosFormateados})`;
        }
      }

      return {
        id: Number(row.id) || 0,
        producto_id: String(productId || ''),
        nombre: nombreCompleto,
        cantidad: Number(row.cantidad) || 0,
        tipo: String(row.tipo || ''),
        desde: String(row.desde || ''),
        hacia: String(row.hacia || ''),
        fecha: row.fecha ? new Date(row.fecha) : new Date()
      };
    });

    return NextResponse.json(transformedRows);

  } catch (error) {
    console.error('Error detallado al obtener transacciones:', error);
    return NextResponse.json({ 
      error: 'Error al obtener transacciones', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
