import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Obtener el valor más reciente usado en cualquier producto
    const result = await query(`
      SELECT valor_compra_usd
      FROM productos
      WHERE valor_compra_usd IS NOT NULL
      ORDER BY id DESC
      LIMIT 1
    `);
    
    if (result.rows.length > 0 && result.rows[0].valor_compra_usd !== null) {
      const parsed = parseFloat(result.rows[0].valor_compra_usd);
      return NextResponse.json({ valor: isNaN(parsed) ? null : parsed });
    } else {
      return NextResponse.json({ valor: null });
    }
  } catch (error) {
    console.error('Error al obtener el valor actual del USD:', error);
    return NextResponse.json({ error: 'Error al obtener el valor actual del USD' }, { status: 500 });
  }
}