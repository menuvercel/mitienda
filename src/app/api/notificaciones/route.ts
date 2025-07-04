import { NextRequest, NextResponse } from 'next/server';
import { getVendedores } from '@/db/usuarios';
import { query } from '@/lib/db';

// Obtener todas las notificaciones
// Crear una nueva notificación
export async function POST(request: NextRequest) {
  try {
    const { texto, usuarioIds } = await request.json();

    if (!texto || !usuarioIds || !Array.isArray(usuarioIds) || usuarioIds.length === 0) {
      return NextResponse.json({
        error: 'Texto y lista de usuarios son requeridos'
      }, { status: 400 });
    }

    // 1. Generar un ID de grupo único
    const grupoResult = await query('SELECT nextval(\'notificacion_grupo_seq\') as grupo_id');
    const grupoId = grupoResult.rows[0].grupo_id;

    console.log('🆔 Nuevo grupo ID:', grupoId);

    // 2. Crear una notificación para cada usuario con el mismo grupo_id
    const placeholders = usuarioIds.map((_, index) =>
      `($1, $2, $${index + 3})`
    ).join(', ');

    const insertQuery = `
    INSERT INTO notificaciones (notificacion_grupo_id, texto, usuario_id)
    VALUES ${placeholders}
    RETURNING id, notificacion_grupo_id, usuario_id
  `;

    const params = [grupoId, texto, ...usuarioIds];
    const result = await query(insertQuery, params);

    console.log('✅ Notificaciones creadas:', result.rows);

    return NextResponse.json({
      success: true,
      grupoId: grupoId,
      notificacionesCreadas: result.rows.length,
      notificaciones: result.rows,
      message: `Notificación creada para ${result.rows.length} usuarios`
    });

  } catch (error) {
    console.error('💥 Error al crear notificación:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
// GET - Obtener todas las notificaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuarioId');

    let notificationsQuery;
    let params: any[];

    if (usuarioId) {
      // Notificaciones para un usuario específico
      notificationsQuery = `
      SELECT 
        n.id,
        n.notificacion_grupo_id,
        n.texto,
        n.usuario_id,
        n.leida,
        n.fecha_creacion,
        n.fecha_lectura,
        u.nombre as usuario_nombre
      FROM notificaciones n
      LEFT JOIN usuarios u ON n.usuario_id = u.id
      WHERE n.usuario_id = $1
      ORDER BY n.fecha_creacion DESC
    `;
      params = [parseInt(usuarioId)];
    } else {
      // Todas las notificaciones agrupadas
      notificationsQuery = `
      WITH notification_groups AS (
        SELECT 
          notificacion_grupo_id,
          texto,
          MIN(fecha_creacion) as fecha_creacion,
          COUNT(*) as total_usuarios,
          COUNT(CASE WHEN leida = true THEN 1 END) as usuarios_leidos,
          COUNT(CASE WHEN leida = false THEN 1 END) as usuarios_no_leidos,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'id', usuario_id,
              'nombre', usuario_nombre,
              'leida', leida,
              'fecha_lectura', fecha_lectura
            ) ORDER BY usuario_nombre
          ) as usuarios
        FROM (
          SELECT 
            n.*,
            u.nombre as usuario_nombre
          FROM notificaciones n
          LEFT JOIN usuarios u ON n.usuario_id = u.id
        ) n_with_users
        GROUP BY notificacion_grupo_id, texto
      )
      SELECT * FROM notification_groups
      ORDER BY fecha_creacion DESC
    `;
      params = [];
    }

    const result = await query(notificationsQuery, params);

    return NextResponse.json({
      success: true,
      notificaciones: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('💥 Error al obtener notificaciones:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
