import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE rol = $1', ['Vendedor']);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener vendedores:', error);
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
  }

  const { nombre, telefono, password } = await request.json();

  try {
    let queryString = 'UPDATE usuarios SET nombre = $1, telefono = $2';
    let queryParams = [nombre, telefono];
    let paramCount = 2;

    // If a new password is provided, add it to the query without hashing
    if (password) {
      queryString += `, password = $${paramCount + 1}`;
      queryParams.push(password);
      paramCount++;
    }

    queryString += ` WHERE id = $${paramCount + 1} RETURNING id, nombre, telefono, rol`;
    queryParams.push(id);

    const result = await query(queryString, queryParams);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar vendedor:', error);
    return NextResponse.json({ error: 'Error al actualizar vendedor' }, { status: 500 });
  }
}