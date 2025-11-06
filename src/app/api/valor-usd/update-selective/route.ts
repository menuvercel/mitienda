import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { valor, productosIds } = await request.json();

    if (typeof valor !== 'number' || valor <= 0) {
      return NextResponse.json({ error: 'El valor del USD debe ser un número positivo' }, { status: 400 });
    }

    if (!Array.isArray(productosIds) || productosIds.length === 0) {
      return NextResponse.json({ error: 'Debe proporcionar al menos un producto para actualizar' }, { status: 400 });
    }

    // Convertir IDs a números para la consulta SQL
    const numericIds = productosIds.map((id: string | number) => Number(id));
    
    // Actualizar solo los productos seleccionados con recalculo de precios
    const result = await query(`
      UPDATE productos
      SET
        valor_compra_usd = $1,
        precio_compra = CASE
          WHEN precio_compra_usd IS NOT NULL THEN precio_compra_usd * $1
          ELSE precio_compra
        END,
        precio = CASE
          WHEN precio_venta_usd IS NOT NULL THEN precio_venta_usd * $1
          ELSE precio
        END
      WHERE id = ANY($2)
      RETURNING id, nombre
    `, [valor, numericIds]);

    return NextResponse.json({
      success: true,
      message: 'Valor del USD actualizado correctamente para los productos seleccionados',
      updatedCount: result.rowCount,
      productosActualizados: result.rows
    });
  } catch (error) {
    console.error('Error al actualizar el valor del USD para productos específicos:', error);
    return NextResponse.json({ error: 'Error al actualizar el valor del USD' }, { status: 500 });
  }
}