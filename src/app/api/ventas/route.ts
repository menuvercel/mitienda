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

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded || (decoded.rol !== 'Vendedor' && decoded.rol !== 'Almacen')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ventaId = searchParams.get('id');

  if (!ventaId) {
    return NextResponse.json({ error: 'Se requiere el ID de la venta' }, { status: 400 });
  }

  try {
    // Inicio de la transacción
    await query('BEGIN');

    // Obtener información de la venta
    const ventaResult = await query(
      'SELECT * FROM ventas WHERE id = $1',
      [ventaId]
    );

    if (ventaResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const venta = ventaResult.rows[0];

    // Verificar si el usuario es el vendedor de la venta o un administrador
    if (decoded.rol !== 'Almacen' && venta.vendedor !== decoded.id) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'No autorizado para eliminar esta venta' }, { status: 403 });
    }

    // Restaurar el stock del vendedor
    await query(
      'UPDATE usuario_productos SET cantidad = cantidad + $1 WHERE producto_id = $2 AND usuario_id = $3',
      [venta.cantidad, venta.producto, venta.vendedor]
    );

    // Eliminar la venta
    await query('DELETE FROM ventas WHERE id = $1', [ventaId]);

    // Confirmar la transacción
    await query('COMMIT');

    return NextResponse.json({ message: 'Venta eliminada con éxito' });
  } catch (error) {
    // Revertir la transacción en caso de error
    await query('ROLLBACK');
    console.error('Error al eliminar venta:', error);
    return NextResponse.json({ error: 'Error al eliminar venta', details: (error as Error).message }, { status: 500 });
  }
}