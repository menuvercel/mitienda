import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT COUNT(*) as count FROM productos');
    
    return NextResponse.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error al contar productos:', error);
    return NextResponse.json({ error: 'Error al contar productos' }, { status: 500 });
  }
}