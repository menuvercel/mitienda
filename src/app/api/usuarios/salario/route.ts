import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PATCH: Update seller salary percentage
export async function PATCH(request: NextRequest) {
  try {
    const { vendedorId, salario } = await request.json();

    if (!vendedorId || salario === undefined) {
      return NextResponse.json(
        { error: 'vendedorId and salario are required' },
        { status: 400 }
      );
    }

    // Validate salary percentage (0-100)
    if (salario < 0 || salario > 100) {
      return NextResponse.json(
        { error: 'Salary percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    const result = await query(
      'UPDATE usuarios SET salario = $1 WHERE id = $2 AND rol = $3 RETURNING id, nombre, salario',
      [salario, parseInt(vendedorId), 'Vendedor']
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating seller salary:', error);
    return NextResponse.json(
      { error: 'Failed to update seller salary' },
      { status: 500 }
    );
  }
}

// GET: Get seller salary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedorId');

    if (!vendedorId) {
      return NextResponse.json(
        { error: 'vendedorId parameter is required' },
        { status: 400 }
      );
    }

    const result = await query(
      'SELECT id, nombre, salario FROM usuarios WHERE id = $1 AND rol = $2',
      [parseInt(vendedorId), 'Vendedor']
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching seller salary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seller salary' },
      { status: 500 }
    );
  }
}