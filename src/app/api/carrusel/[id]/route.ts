import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/carrusel/[id] - Obtener una imagen específica del carrusel
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const result = await query(
      'SELECT * FROM carrusel_imagenes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener imagen del carrusel:", error);
    return NextResponse.json(
      { error: "Error al obtener imagen del carrusel" },
      { status: 500 }
    );
  }
}

// PUT /api/carrusel/[id] - Actualizar una imagen del carrusel
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { foto, orden, activo } = body;

    console.log(`Actualizando imagen ${id} con datos:`, body);

    // Verificar si la imagen existe
    const checkResult = await query(
      'SELECT * FROM carrusel_imagenes WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 }
      );
    }

    // Construir la consulta de actualización dinámicamente
    let queryText = 'UPDATE carrusel_imagenes SET ';
    const values = [];
    const updateFields = [];

    if (foto !== undefined) {
      updateFields.push(`foto = $${values.length + 1}`);
      values.push(foto);
    }

    if (orden !== undefined) {
      updateFields.push(`orden = $${values.length + 1}`);
      values.push(orden);
    }

    if (activo !== undefined) {
      updateFields.push(`activo = $${values.length + 1}`);
      values.push(activo);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron campos para actualizar" },
        { status: 400 }
      );
    }

    queryText += updateFields.join(', ');
    queryText += ` WHERE id = $${values.length + 1} RETURNING *`;
    values.push(id);

    console.log('Ejecutando consulta:', queryText, 'con valores:', values);

    const result = await query(queryText, values);
    console.log('Resultado de la actualización:', result.rows[0]);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar imagen del carrusel:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      {
        error: "Error al actualizar imagen del carrusel",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// DELETE /api/carrusel/[id] - Eliminar una imagen del carrusel
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Verificar si la imagen existe
    const checkResult = await query(
      'SELECT * FROM carrusel_imagenes WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar la imagen
    await query(
      'DELETE FROM carrusel_imagenes WHERE id = $1',
      [id]
    );

    // Reordenar las imágenes restantes para mantener una secuencia ordenada
    await query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY orden) - 1 as new_orden
        FROM carrusel_imagenes
      )
      UPDATE carrusel_imagenes
      SET orden = ranked.new_orden
      FROM ranked
      WHERE carrusel_imagenes.id = ranked.id
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar imagen del carrusel:", error);
    return NextResponse.json(
      { error: "Error al eliminar imagen del carrusel" },
      { status: 500 }
    );
  }
}