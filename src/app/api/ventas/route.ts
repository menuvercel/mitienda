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
  const { productoId, cantidad, fecha } = body;

  if (!productoId || !cantidad || !fecha) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  try {
    // Convertimos la fecha ISO a un objeto Date
    const fechaVenta = new Date(fecha);
    
    // Inicio de la transacción
    await query('BEGIN');

    // Obtener precio del producto y verificar stock del vendedor
    const productResult = await query(
      'SELECT p.precio, up.cantidad as stock_vendedor FROM productos p JOIN usuario_productos up ON p.id = up.producto_id WHERE p.id = $1 AND up.usuario_id = $2',
      [productoId, decoded.id]
    );

    if (productResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Producto no encontrado o no asignado al vendedor' }, { status: 404 });
    }

    const { precio: precioUnitario, stock_vendedor } = productResult.rows[0];

    if (stock_vendedor < cantidad) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
    }

    // Actualizar stock del vendedor
    await query(
      'UPDATE usuario_productos SET cantidad = cantidad - $1 WHERE producto_id = $2 AND usuario_id = $3',
      [cantidad, productoId, decoded.id]
    );

    // Crear registro de venta
    const saleResult = await query(
      'INSERT INTO ventas (producto, cantidad, precio_unitario, total, vendedor, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [productoId, cantidad, precioUnitario, precioUnitario * cantidad, decoded.id, fechaVenta]
    );

    // Confirmar la transacción
    await query('COMMIT');

    return NextResponse.json(saleResult.rows[0]);
  } catch (error) {
    // Revertir la transacción en caso de error
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

  if (!vendedorId && !productoId) {
    return NextResponse.json({ error: 'Se requiere vendedorId o productoId' }, { status: 400 });
  }

  try {
    let result;
    if (productoId) {
      result = await query(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.producto = $1
         ORDER BY v.fecha DESC`,
        [productoId]
      );
    } else {
      result = await query(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.vendedor = $1
         ORDER BY v.fecha DESC`,
        [vendedorId]
      );
    }
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ error: 'Error al obtener ventas', details: (error as Error).message }, { status: 500 });
  }
}

// Nuevo método para actualizar una venta
export async function PUT(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const saleId = searchParams.get('id');

  if (!saleId) {
    return NextResponse.json({ error: 'ID de venta es requerido' }, { status: 400 });
  }

  const body = await request.json();
  const { cantidad } = body;

  if (!cantidad || cantidad <= 0) {
    return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
  }

  try {
    // Iniciar transacción
    await query('BEGIN');

    // Verificar la venta original
    const originalSaleResult = await query(
      'SELECT * FROM ventas WHERE id = $1 AND vendedor = $2',
      [saleId, decoded.id]
    );

    if (originalSaleResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const originalSale = originalSaleResult.rows[0];
    const diferenciaStock = originalSale.cantidad - cantidad;

    // Verificar stock disponible
    const stockResult = await query(
      'SELECT cantidad FROM usuario_productos WHERE usuario_id = $1 AND producto_id = $2',
      [decoded.id, originalSale.producto]
    );

    if (stockResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Si se está reduciendo la cantidad vendida, devolver stock
    if (diferenciaStock > 0) {
      await query(
        'UPDATE usuario_productos SET cantidad = cantidad + $1 WHERE usuario_id = $2 AND producto_id = $3',
        [diferenciaStock, decoded.id, originalSale.producto]
      );
    } 
    // Si se está aumentando la cantidad vendida, verificar stock disponible
    else if (diferenciaStock < 0) {
      const stockDisponible = stockResult.rows[0].cantidad;
      if (Math.abs(diferenciaStock) > stockDisponible) {
        await query('ROLLBACK');
        return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
      }
      
      await query(
        'UPDATE usuario_productos SET cantidad = cantidad - $1 WHERE usuario_id = $2 AND producto_id = $3',
        [Math.abs(diferenciaStock), decoded.id, originalSale.producto]
      );
    }

    // Actualizar la venta
    const updatedSaleResult = await query(
      'UPDATE ventas SET cantidad = $1, total = precio_unitario * $1 WHERE id = $2 RETURNING *',
      [cantidad, saleId]
    );

    // Confirmar transacción
    await query('COMMIT');

    return NextResponse.json(updatedSaleResult.rows[0]);
  } catch (error) {
    // Revertir la transacción en caso de error
    await query('ROLLBACK');
    console.error('Error al actualizar venta:', error);
    return NextResponse.json({ error: 'Error al actualizar venta' }, { status: 500 });
  }
}

// Nuevo método para eliminar una venta
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const saleId = searchParams.get('id');

  if (!saleId) {
    return NextResponse.json({ error: 'ID de venta es requerido' }, { status: 400 });
  }

  try {
    // Iniciar transacción
    await query('BEGIN');

    // Verificar la venta original
    const originalSaleResult = await query(
      'SELECT * FROM ventas WHERE id = $1 AND vendedor = $2',
      [saleId, decoded.id]
    );

    if (originalSaleResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const originalSale = originalSaleResult.rows[0];

    // Devolver stock al vendedor
    await query(
      'UPDATE usuario_productos SET cantidad = cantidad + $1 WHERE usuario_id = $2 AND producto_id = $3',
      [originalSale.cantidad, decoded.id, originalSale.producto]
    );

    // Eliminar la venta
    await query('DELETE FROM ventas WHERE id = $1', [saleId]);

    // Confirmar transacción
    await query('COMMIT');

    return NextResponse.json({ message: 'Venta eliminada exitosamente' });
  } catch (error) {
    // Revertir la transacción en caso de error
    await query('ROLLBACK');
    console.error('Error al eliminar venta:', error);
    return NextResponse.json({ error: 'Error al eliminar venta' }, { status: 500 });
  }
}