import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';

// GET: Listar todos los moderadores
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      'SELECT id, nombre, telefono, rol, activo FROM usuarios WHERE rol = $1 ORDER BY id DESC',
      ['Moderador']
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener moderadores:', error);
    return NextResponse.json({ error: 'Error al obtener moderadores' }, { status: 500 });
  }
}

// POST: Crear un nuevo moderador
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, password, telefono, activo } = body;

    const trimmedNombre = nombre ? String(nombre).trim() : '';
    const trimmedPassword = password ? String(password).trim() : '';

    if (!trimmedNombre || !trimmedPassword) {
      console.warn('⚠️ Intento de crear moderador con datos incompletos:', { nombre: trimmedNombre, passwordLength: trimmedPassword.length });
      return NextResponse.json({ error: 'El nombre y la contraseña son requeridos' }, { status: 400 });
    }

    // Verificar si ya existe un usuario con el mismo nombre (insensible a mayúsculas/minúsculas y espacios)
    const existingUser = await query(
      'SELECT id, nombre, rol FROM usuarios WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1', 
      [trimmedNombre]
    );

    if (existingUser.rows.length > 0) {
      const userFound = existingUser.rows[0];
      console.warn(`⚠️ Ya existe un usuario con el nombre "${trimmedNombre}" (ID: ${userFound.id}, Rol: ${userFound.rol})`);
      return NextResponse.json({ 
        error: `Ya existe una cuenta con el nombre "${trimmedNombre}" (Rol actual: ${userFound.rol}). Por favor elige otro nombre.` 
      }, { status: 400 });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    const isActivo = activo !== undefined ? Boolean(activo) : true;
    const cleanTelefono = telefono ? String(telefono).trim() : '';

    const result = await query(
      `INSERT INTO usuarios (nombre, password, telefono, rol, activo) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nombre, telefono, rol, activo`,
      [trimmedNombre, hashedPassword, cleanTelefono, 'Moderador', isActivo]
    );

    console.log(`✅ Moderador creado exitosamente: "${trimmedNombre}" (ID: ${result.rows[0].id})`);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error al crear moderador:', error);
    if (error.code === '23505') {
      return NextResponse.json({ 
        error: 'Ya existe una cuenta registrada con este nombre en la base de datos.' 
      }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Error interno al crear moderador' }, { status: 500 });
  }
}

// PUT: Actualizar un moderador existente
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, telefono, password, activo } = body;

    // Obtener datos actuales
    const userResult = await query(
      'SELECT nombre, telefono, password FROM usuarios WHERE id = $1 AND rol = $2',
      [id, 'Moderador']
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Moderador no encontrado' }, { status: 404 });
    }
    const currentModerator = userResult.rows[0];

    const cleanNombre = nombre !== undefined ? String(nombre).trim() : currentModerator.nombre;
    const cleanTelefono = telefono !== undefined ? String(telefono).trim() : currentModerator.telefono;
    const isActivo = activo !== undefined ? Boolean(activo) : true;

    // Si cambió de nombre, verificar que el nuevo nombre no esté en uso por otro usuario
    if (cleanNombre.toLowerCase() !== currentModerator.nombre.toLowerCase()) {
      const existingUser = await query(
        'SELECT id, rol FROM usuarios WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) AND id != $2 LIMIT 1',
        [cleanNombre, id]
      );
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ 
          error: `Ya existe otra cuenta con el nombre "${cleanNombre}".` 
        }, { status: 400 });
      }
    }

    let hashedPassword = currentModerator.password;
    if (password && String(password).trim()) {
      hashedPassword = await bcrypt.hash(String(password).trim(), 10);
    }

    const result = await query(
      `UPDATE usuarios 
       SET nombre = $1, telefono = $2, password = $3, activo = $4 
       WHERE id = $5 AND rol = $6 
       RETURNING id, nombre, telefono, rol, activo`,
      [cleanNombre, cleanTelefono, hashedPassword, isActivo, id, 'Moderador']
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error al actualizar moderador:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una cuenta con este nombre' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Error al actualizar moderador' }, { status: 500 });
  }
}

// DELETE: Eliminar un moderador
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    // Verificar que sea un moderador
    const checkResult = await query('SELECT id FROM usuarios WHERE id = $1 AND rol = $2', [id, 'Moderador']);
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Moderador no encontrado' }, { status: 404 });
    }

    await query('BEGIN');

    try {
      // Eliminar registros de bitácora del moderador
      await query('DELETE FROM bitacora_moderadores WHERE moderador_id = $1', [id]);
      
      // Eliminar el usuario
      await query('DELETE FROM usuarios WHERE id = $1 AND rol = $2', [id, 'Moderador']);

      await query('COMMIT');
      return NextResponse.json({ success: true, message: 'Moderador eliminado correctamente' });
    } catch (txError) {
      await query('ROLLBACK');
      throw txError;
    }
  } catch (error: any) {
    console.error('Error al eliminar moderador:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar moderador' }, { status: 500 });
  }
}
