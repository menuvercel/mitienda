import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Obtener productos de una subsección
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const result = await query(
      `SELECT * FROM productos WHERE subseccion_id = $1 ORDER BY nombre`,
      [id]
    );
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos de la subsección:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// PUT - Asignar productos a una subsección
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { productos, forzarCambioSeccion = false } = body;
    
    if (!Array.isArray(productos)) {
      return NextResponse.json(
        { error: 'Se esperaba un array de IDs de productos' },
        { status: 400 }
      );
    }
    
    // ✅ CONVERTIR LOS IDs DE STRING A INTEGER
    const productosIds = productos.map(id => parseInt(id, 10));
    
    // Verificar que todos los IDs son válidos
    if (productosIds.some(id => isNaN(id))) {
      return NextResponse.json(
        { error: 'Algunos IDs de productos no son válidos' },
        { status: 400 }
      );
    }
    
    // Verificar que la subsección existe
    const subseccionResult = await query('SELECT id, seccion_id FROM subsecciones WHERE id = $1', [id]);
    if (subseccionResult.rowCount === 0) {
      return NextResponse.json({ error: 'Subsección no encontrada' }, { status: 404 });
    }
    
    const seccion_id = subseccionResult.rows[0].seccion_id;
    
    // Comenzar una transacción
    await query('BEGIN');
    
    try {
      // Primero, eliminar la asignación de subsección para todos los productos de esta subsección
      await query('UPDATE productos SET subseccion_id = NULL WHERE subseccion_id = $1', [id]);
      
      // Luego, asignar los productos seleccionados a esta subsección
      if (productosIds.length > 0) {
        // ✅ USAR ARRAY DE INTEGERS EN LUGAR DE STRINGS
        const productosDeOtraSecciones = await query(
          `SELECT id, nombre, seccion_id FROM productos 
           WHERE id = ANY($1::integer[]) AND seccion_id IS NOT NULL AND seccion_id != $2`,
          [productosIds, seccion_id] // ✅ Usar productosIds (integers)
        );
        
        // Corregir la verificación para manejar el caso donde rowCount puede ser null
        const hayProductosConflicto = productosDeOtraSecciones.rowCount !== null && productosDeOtraSecciones.rowCount > 0;
        
        // Si hay productos de otra sección y no se ha forzado el cambio, devolver error
        if (hayProductosConflicto && !forzarCambioSeccion) {
          await query('ROLLBACK');
          return NextResponse.json({
            error: 'Algunos productos pertenecen a otra sección',
            productosConflicto: productosDeOtraSecciones.rows,
            requiereForzado: true
          }, { status: 409 });
        }
        
        // ✅ USAR ARRAY DE INTEGERS EN LUGAR DE STRINGS
        await query(
          `UPDATE productos 
           SET subseccion_id = $1, seccion_id = $2 
           WHERE id = ANY($3::integer[])`,
          [id, seccion_id, productosIds] // ✅ Usar productosIds (integers)
        );
      }
      
      // Confirmar la transacción
      await query('COMMIT');
      
      return NextResponse.json({ 
        success: true,
        message: 'Productos asignados correctamente a la subsección'
      });
    } catch (error) {
      // Revertir la transacción en caso de error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error al asignar productos a la subsección:', error);
    return NextResponse.json({ error: 'Error al asignar productos' }, { status: 500 });
  }
}