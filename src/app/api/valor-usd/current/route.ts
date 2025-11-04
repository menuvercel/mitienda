import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Obtener el valor más reciente usado en cualquier producto
    const result = await query(`
      SELECT valor_compra_usd
      FROM productos
      WHERE valor_compra_usd IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      return NextResponse.json({ valor: result.rows[0].valor_compra_usd });
    } else {
      return NextResponse.json({ valor: null });
    }
  } catch (error) {
    console.error('Error al obtener el valor actual del USD:', error);
    return NextResponse.json({ error: 'Error al obtener el valor actual del USD' }, { status: 500 });
  }
}