import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: Get expenses for a specific seller and month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedorId');
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    if (!vendedorId) {
      return NextResponse.json(
        { error: 'vendedorId parameter is required' },
        { status: 400 }
      );
    }

    let query_text = 'SELECT * FROM gastos_vendedores WHERE vendedor_id = $1';
    const params: any[] = [parseInt(vendedorId)];

    if (mes && anio) {
      query_text += ' AND mes = $2 AND anio = $3';
      params.push(parseInt(mes), parseInt(anio));
    }

    query_text += ' ORDER BY nombre';

    const result = await query(query_text, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching seller expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seller expenses' },
      { status: 500 }
    );
  }
}

// POST: Create or update a seller expense
export async function POST(request: NextRequest) {
  try {
    const { vendedorId, nombre, valor, mes, anio } = await request.json();

    if (!vendedorId || !nombre || valor === undefined || !mes || !anio) {
      return NextResponse.json(
        { error: 'All fields are required: vendedorId, nombre, valor, mes, anio' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO gastos_vendedores (vendedor_id, nombre, valor, mes, anio)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (vendedor_id, nombre, mes, anio)
       DO UPDATE SET valor = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [parseInt(vendedorId), nombre, valor, mes, anio]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating/updating seller expense:', error);
    return NextResponse.json(
      { error: 'Failed to create/update seller expense' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a seller expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedorId');
    const nombre = searchParams.get('nombre');
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    if (!vendedorId || !nombre || !mes || !anio) {
      return NextResponse.json(
        { error: 'vendedorId, nombre, mes, and anio parameters are required' },
        { status: 400 }
      );
    }

    const result = await query(
      'DELETE FROM gastos_vendedores WHERE vendedor_id = $1 AND nombre = $2 AND mes = $3 AND anio = $4 RETURNING *',
      [parseInt(vendedorId), nombre, mes, anio]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting seller expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete seller expense' },
      { status: 500 }
    );
  }
}