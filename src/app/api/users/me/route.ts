// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE rol = $1', ['Almacen']);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios de almacén:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios de almacén' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
  }

  const { nombre, telefono, password } = await request.json();

  try {
    const queryParams = [nombre, telefono];
    let queryString = 'UPDATE usuarios SET nombre = $1, telefono = $2';

    if (password) {
      queryString += ', password = $3';
      queryParams.push(password);
    }

    queryString += ' WHERE id = $' + (queryParams.length + 1) + ' RETURNING id, nombre, telefono, rol';
    queryParams.push(id);

    const result = await query(queryString, queryParams);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Usuario de almacén no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar usuario de almacén:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario de almacén' }, { status: 500 });
  }
}
