import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ventaId = params.id;
  const vendedorId = request.nextUrl.searchParams.get('vendedorId');

  if (!vendedorId) {
    return NextResponse.json({ error: 'Se requiere el ID del vendedor' }, { status: 400 });
  }

  try {
    await query('BEGIN');

    const ventaResult = await query(
      'SELECT * FROM ventas WHERE id = $1',
      [ventaId]
    );

    if (ventaResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const venta = ventaResult.rows[0];

    // Restaurar stock según parámetros
    if (venta.parametros) {
      const parametros = JSON.parse(venta.parametros);
      for (const param of parametros) {
        await query(
          `UPDATE usuario_producto_parametros 
           SET cantidad = cantidad + $1 
           WHERE usuario_id = $2 AND producto_id = $3 AND nombre = $4`,
          [param.cantidad, venta.vendedor, venta.producto, param.nombre]
        );
      }
    } else {
      await query(
        'UPDATE usuario_productos SET cantidad = cantidad + $1 WHERE producto_id = $2 AND usuario_id = $3',
        [venta.cantidad, venta.producto, venta.vendedor]
      );
    }

    await query('DELETE FROM ventas WHERE id = $1', [ventaId]);
    await query('COMMIT');

    return NextResponse.json({ message: 'Venta eliminada con éxito' });
  } catch (error) {
    await query('ROLLBACK');
    return NextResponse.json({ error: 'Error al eliminar venta' }, { status: 500 });
  }
}
