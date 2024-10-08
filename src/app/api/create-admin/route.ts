import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  // Verifica si ya existe un usuario admin
  const checkAdminResult = await query('SELECT * FROM usuarios WHERE nombre = $1', ['admin']);
  
  if (checkAdminResult.rows.length > 0) {
    return NextResponse.json({ error: 'El usuario admin ya existe' }, { status: 400 });
  }

  // Crea el nuevo usuario admin
  const hashedPassword = await bcrypt.hash('admin', 10);
  
  try {
    const result = await query(
      'INSERT INTO usuarios (nombre, password, telefono, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, rol',
      ['admin', hashedPassword, '54547503', 'Almacen']
    );

    const newAdmin = result.rows[0];

    return NextResponse.json({
      message: 'Usuario admin creado con éxito',
      user: {
        id: newAdmin.id,
        nombre: newAdmin.nombre,
        rol: newAdmin.rol
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear el usuario admin:', error);
    return NextResponse.json({ error: 'Error al crear el usuario admin' }, { status: 500 });
  }
}