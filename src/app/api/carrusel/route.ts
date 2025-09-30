import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/carrusel - Obtener todas las imágenes del carrusel
export async function GET() {
  try {
    const imagenes = await query(
      'SELECT * FROM carrusel_imagenes ORDER BY orden ASC'
    );

    return NextResponse.json(imagenes.rows);
  } catch (error) {
    console.error("Error al obtener imágenes del carrusel:", error);
    return NextResponse.json(
      { error: "Error al obtener imágenes del carrusel" },
      { status: 500 }
    );
  }
}

// POST /api/carrusel - Agregar una nueva imagen al carrusel
export async function POST(request: Request) {
  try {
    // Asegurarnos de que el cuerpo de la solicitud sea válido
    if (!request.body) {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud está vacío" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("Cuerpo de la solicitud recibido:", body); // Añadir log para depuración

    const { foto, orden, activo } = body;

    if (!foto) {
      return NextResponse.json(
        { error: "La URL de la imagen es requerida" },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO carrusel_imagenes (foto, orden, activo) VALUES ($1, $2, $3) RETURNING *',
      [foto, orden || 0, activo !== undefined ? activo : true]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error al agregar imagen al carrusel:", error);

    // Proporcionar más detalles sobre el error
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        error: "Error al agregar imagen al carrusel",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}