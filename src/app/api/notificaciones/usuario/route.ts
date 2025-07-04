import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Obtener notificaciones del usuario actual
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Se requiere ID de usuario' }, { status: 400 });
    }

    const notificacionesResult = await query(`
      SELECT 
        id, 
        texto, 
        fecha_creacion as fecha,
        leida,  -- Cambiado de 'leido' a 'leida'
        fecha_lectura
      FROM notificaciones
      WHERE usuario_id = $1
      ORDER BY fecha_creacion DESC
    `, [userId]);

    return NextResponse.json(notificacionesResult.rows);
  } catch (error) {
    console.error('Error al obtener notificaciones del usuario:', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}
