import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { valor } = await request.json();

    if (typeof valor !== 'number' || valor <= 0) {
      return NextResponse.json({ error: 'El valor del USD debe ser un número positivo' }, { status: 400 });
    }

    // Actualizar todos los productos con el nuevo valor de USD
    // Eliminamos la referencia a updated_at ya que no existe en la tabla
    const result = await query(`
      UPDATE productos
      SET valor_compra_usd = $1
      WHERE 1=1
      RETURNING id
    `, [valor]);

    return NextResponse.json({
      success: true,
      message: 'Valor del USD actualizado correctamente',
      updatedCount: result.rowCount
    });
  } catch (error) {
    console.error('Error al actualizar el valor del USD:', error);
    return NextResponse.json({ error: 'Error al actualizar el valor del USD' }, { status: 500 });
  }
}