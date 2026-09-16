import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Get expenses for a specific seller and month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedorId');
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const nombre = searchParams.get('nombre');

    if (!vendedorId) {
      return NextResponse.json(
        { error: 'vendedorId parameter is required' },
        { status: 400 }
      );
    }

    let query_text = `
      SELECT id, vendedor_id, nombre, valor, mes, anio, 
             COALESCE(tipo_gasto, 'fijo') as tipo_gasto,
             created_at, updated_at
      FROM gastos_vendedores 
      WHERE vendedor_id = $1
    `;
    const params: any[] = [parseInt(vendedorId)];
    let paramIndex = 2;

    if (mes && anio) {
      query_text += ` AND mes = $${paramIndex++} AND anio = $${paramIndex++}`;
      params.push(parseInt(mes), parseInt(anio));
    }

    if (nombre) {
      query_text += ` AND nombre = $${paramIndex++}`;
      params.push(nombre);
    }

    query_text += ' ORDER BY id DESC';

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
    const { vendedorId, nombre, valor, mes, anio, tipo_gasto } = await request.json();

    if (!vendedorId || !nombre || valor === undefined || !mes || !anio) {
      return NextResponse.json(
        { error: 'All fields are required: vendedorId, nombre, valor, mes, anio' },
        { status: 400 }
      );
    }

    const tipo = tipo_gasto === 'variable' ? 'variable' : 'fijo';

    const result = await query(
      `INSERT INTO gastos_vendedores (vendedor_id, nombre, valor, mes, anio, tipo_gasto)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (vendedor_id, nombre, mes, anio)
       DO UPDATE SET valor = $3, tipo_gasto = $6, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [parseInt(vendedorId), nombre.trim(), parseFloat(valor), parseInt(mes), parseInt(anio), tipo]
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

// PUT: Edit a seller expense
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, vendedorId, nombre, valor, mes, anio, tipo_gasto } = body;

    if (!id && (!vendedorId || !nombre || !mes || !anio)) {
      return NextResponse.json(
        { error: 'Gasto ID or (vendedorId, nombre, mes, anio) required' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      params.push(nombre.trim());
    }

    if (valor !== undefined) {
      updates.push(`valor = $${paramIndex++}`);
      params.push(parseFloat(valor));
    }

    if (tipo_gasto !== undefined) {
      updates.push(`tipo_gasto = $${paramIndex++}`);
      params.push(tipo_gasto === 'variable' ? 'variable' : 'fijo');
    }

    if (mes !== undefined) {
      updates.push(`mes = $${paramIndex++}`);
      params.push(parseInt(mes));
    }

    if (anio !== undefined) {
      updates.push(`anio = $${paramIndex++}`);
      params.push(parseInt(anio));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    let queryText = `UPDATE gastos_vendedores SET ${updates.join(', ')} WHERE `;
    if (id) {
      queryText += `id = $${paramIndex}`;
      params.push(parseInt(id));
    } else {
      queryText += `vendedor_id = $${paramIndex++} AND nombre = $${paramIndex++} AND mes = $${paramIndex++} AND anio = $${paramIndex}`;
      params.push(parseInt(vendedorId), nombre, parseInt(mes), parseInt(anio));
    }
    queryText += ` RETURNING *`;

    const result = await query(queryText, params);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating seller expense:', error);
    return NextResponse.json(
      { error: 'Failed to update seller expense', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete a seller expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const vendedorId = searchParams.get('vendedorId');
    const nombre = searchParams.get('nombre');
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    let result;
    if (id) {
      result = await query('DELETE FROM gastos_vendedores WHERE id = $1 RETURNING *', [parseInt(id)]);
    } else if (vendedorId && nombre && mes && anio) {
      result = await query(
        'DELETE FROM gastos_vendedores WHERE vendedor_id = $1 AND nombre = $2 AND mes = $3 AND anio = $4 RETURNING *',
        [parseInt(vendedorId), nombre, parseInt(mes), parseInt(anio)]
      );
    } else {
      return NextResponse.json(
        { error: 'id or (vendedorId, nombre, mes, and anio) parameters are required' },
        { status: 400 }
      );
    }

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