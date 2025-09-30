import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Obtener una subsección específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Obtener la subsección con su conteo de productos
    const result = await query(
      `SELECT s.*, COUNT(p.id) as productos_count
       FROM subsecciones s
       LEFT JOIN productos p ON s.id = p.subseccion_id
       WHERE s.id = $1
       GROUP BY s.id`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Subsección no encontrada' }, { status: 404 });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener la subsección:', error);
    return NextResponse.json({ error: 'Error al obtener la subsección' }, { status: 500 });
  }
}

// PUT - Actualizar una subsección existente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { nombre, foto, seccion_id } = body;
    
    if (!nombre || !seccion_id) {
      return NextResponse.json(
        { error: 'El nombre y el ID de la sección son obligatorios' },
        { status: 400 }
      );
    }
    
    // Verificar que la subsección existe
    const subseccionResult = await query('SELECT id FROM subsecciones WHERE id = $1', [id]);
    if (subseccionResult.rowCount === 0) {
      return NextResponse.json({ error: 'Subsección no encontrada' }, { status: 404 });
    }
    
    // Verificar que la sección existe
    const seccionResult = await query('SELECT id FROM secciones WHERE id = $1', [seccion_id]);
    if (seccionResult.rowCount === 0) {
      return NextResponse.json({ error: 'La sección especificada no existe' }, { status: 404 });
    }
    
    // Si se cambia la sección de la subsección, actualizar también la sección de todos sus productos
    if (seccion_id) {
      const currentSeccionResult = await query('SELECT seccion_id FROM subsecciones WHERE id = $1', [id]);
      const currentSeccionId = currentSeccionResult.rows[0]?.seccion_id;
      
      if (currentSeccionId && currentSeccionId !== seccion_id) {
        // Actualizar la sección de todos los productos de esta subsección
        await query(
          'UPDATE productos SET seccion_id = $1 WHERE subseccion_id = $2',
          [seccion_id, id]
        );
      }
    }
    
    // Actualizar la subsección
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (nombre) {
      updateFields.push(`nombre = $${paramIndex}`);
      updateValues.push(nombre);
      paramIndex++;
    }
    
    // Solo actualizar la foto si se proporciona un nuevo valor
    if (foto !== undefined) {
      updateFields.push(`foto = $${paramIndex}`);
      updateValues.push(foto || null);
      paramIndex++;
    }
    
    if (seccion_id) {
      updateFields.push(`seccion_id = $${paramIndex}`);
      updateValues.push(seccion_id);
      paramIndex++;
    }
    
    updateValues.push(id);
    
    const result = await query(
      `UPDATE subsecciones SET ${updateFields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar la subsección:', error);
    return NextResponse.json({ error: 'Error al actualizar la subsección' }, { status: 500 });
  }
}

// DELETE - Eliminar una subsección
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Verificar que la subsección existe
    const subseccionResult = await query('SELECT id FROM subsecciones WHERE id = $1', [id]);
    if (subseccionResult.rowCount === 0) {
      return NextResponse.json({ error: 'Subsección no encontrada' }, { status: 404 });
    }
    
    // Comenzar una transacción
    await query('BEGIN');
    
    try {
      // Desasociar todos los productos de esta subsección (no eliminarlos)
      await query('UPDATE productos SET subseccion_id = NULL WHERE subseccion_id = $1', [id]);
      
      // Eliminar la subsección
      await query('DELETE FROM subsecciones WHERE id = $1', [id]);
      
      // Confirmar la transacción
      await query('COMMIT');
      
      return NextResponse.json({ success: true, message: 'Subsección eliminada correctamente' });
    } catch (error) {
      // Revertir la transacción en caso de error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error al eliminar la subsección:', error);
    return NextResponse.json({ error: 'Error al eliminar la subsección' }, { status: 500 });
  }
}