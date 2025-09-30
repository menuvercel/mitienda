import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Obtener todas las subsecciones
export async function GET(request: NextRequest) {
  try {
    const seccionId = request.nextUrl.searchParams.get('seccion_id');
    const incluirProductos = request.nextUrl.searchParams.get('incluir_productos') === 'true';

    let sql = `
      SELECT s.*, COUNT(p.id) as productos_count
      FROM subsecciones s
      LEFT JOIN productos p ON s.id = p.subseccion_id
    `;

    const params = [];

    if (seccionId) {
      sql += ` WHERE s.seccion_id = $1`;
      params.push(seccionId);
    }

    sql += ` GROUP BY s.id ORDER BY s.nombre`;

    const result = await query(sql, params);

    // Si se solicita incluir productos, obtener los productos para cada subsección
    if (incluirProductos && result.rows && result.rows.length > 0) {
      const subsecciones = result.rows;

      for (const subseccion of subsecciones) {
        const productosResult = await query(
          `SELECT * FROM productos WHERE subseccion_id = $1 ORDER BY nombre`,
          [subseccion.id]
        );
        subseccion.productos = productosResult.rows;
      }
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener subsecciones:', error);
    return NextResponse.json({ error: 'Error al obtener subsecciones' }, { status: 500 });
  }
}

// POST - Crear una nueva subsección
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, foto, seccion_id } = body;

    if (!nombre || !seccion_id) {
      return NextResponse.json(
        { error: 'El nombre y el ID de la sección son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que la sección existe
    const seccionResult = await query('SELECT id FROM secciones WHERE id = $1', [seccion_id]);
    if (!seccionResult.rows || seccionResult.rows.length === 0) {
      return NextResponse.json({ error: 'La sección especificada no existe' }, { status: 404 });
    }

    // Verificar si ya existe una subsección con el mismo nombre en la misma sección
    const existingSubseccion = await query(
      'SELECT id FROM subsecciones WHERE nombre = $1 AND seccion_id = $2',
      [nombre, seccion_id]
    );

    if (existingSubseccion.rows && existingSubseccion.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una subsección con este nombre en la sección seleccionada' },
        { status: 409 }
      );
    }

    const result = await query(
      `INSERT INTO subsecciones (nombre, foto, seccion_id, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
      [nombre, foto || null, seccion_id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear subsección:', error);
    return NextResponse.json({ error: 'Error al crear subsección' }, { status: 500 });
  }
}