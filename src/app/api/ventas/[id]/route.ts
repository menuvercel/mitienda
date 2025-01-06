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

    // 1. Obtener la venta y verificar si el producto tiene parámetros
    const ventaResult = await query(
      `SELECT v.*, p.tiene_parametros 
       FROM ventas v
       JOIN productos p ON v.producto = p.id 
       WHERE v.id = $1`,
      [ventaId]
    );

    if (ventaResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const venta = ventaResult.rows[0];

    // 2. Restaurar stock según el tipo de producto
    if (venta.tiene_parametros) {
      // Obtener los parámetros de la venta desde venta_parametros
      const parametrosResult = await query(
        `SELECT * FROM venta_parametros WHERE venta_id = $1`,
        [ventaId]
      );

      for (const param of parametrosResult.rows) {
        // Verificar si existe el registro
        const existingParamResult = await query(
          `SELECT * FROM usuario_producto_parametros 
           WHERE usuario_id = $1 
           AND producto_id = $2 
           AND nombre = $3`,
          [venta.vendedor, venta.producto, param.parametro]
        );

        if (existingParamResult.rows.length > 0) {
          // Actualizar registro existente
          await query(
            `UPDATE usuario_producto_parametros 
             SET cantidad = cantidad + $1 
             WHERE usuario_id = $2 
             AND producto_id = $3 
             AND nombre = $4`,
            [param.cantidad, venta.vendedor, venta.producto, param.parametro]
          );
        } else {
          // Crear nuevo registro
          await query(
            `INSERT INTO usuario_producto_parametros 
             (usuario_id, producto_id, nombre, cantidad) 
             VALUES ($1, $2, $3, $4)`,
            [venta.vendedor, venta.producto, param.parametro, param.cantidad]
          );
        }
      }
    } else {
      // Solo actualizar usuario_productos si el producto NO tiene parámetros
      await query(
        'UPDATE usuario_productos SET cantidad = cantidad + $1 WHERE producto_id = $2 AND usuario_id = $3',
        [venta.cantidad, venta.producto, venta.vendedor]
      );
    }

    // 3. Eliminar registros relacionados
    await query('DELETE FROM venta_parametros WHERE venta_id = $1', [ventaId]);
    await query('DELETE FROM ventas WHERE id = $1', [ventaId]);
    
    await query('COMMIT');

    return NextResponse.json({ message: 'Venta eliminada con éxito' });
  } catch (error) {
    console.error('Error al eliminar venta:', error);
    await query('ROLLBACK');
    return NextResponse.json({ error: 'Error al eliminar venta' }, { status: 500 });
  }
}
