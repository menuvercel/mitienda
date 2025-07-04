import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Marcar notificación como leída
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificacionId = params.id;
    const data = await request.json();
    const userId = data.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Se requiere ID de usuario' }, { status: 400 });
    }

    const checkResult = await query(
      'SELECT * FROM notificaciones WHERE id = $1 AND usuario_id = $2',
      [notificacionId, userId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
    }

    // Marcar como leída
    await query(
      'UPDATE notificaciones SET leida = true, fecha_lectura = CURRENT_TIMESTAMP WHERE id = $1 AND usuario_id = $2',
      [notificacionId, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // El ID puede ser el id individual O el notificacion_grupo_id
    const inputId = parseInt(params.id);

    if (isNaN(inputId)) {
      return NextResponse.json({
        error: 'ID inválido'
      }, { status: 400 });
    }

    // Primero determinar si es un ID individual o un grupo ID
    const notificationInfo = await query(`
    SELECT 
      id, 
      notificacion_grupo_id, 
      texto,
      usuario_id
    FROM notificaciones 
    WHERE id = $1 OR notificacion_grupo_id = $1
    LIMIT 1
  `, [inputId]);

    if (notificationInfo.rows.length === 0) {
      return NextResponse.json({
        error: 'Notificación no encontrada'
      }, { status: 404 });
    }

    const grupoId = notificationInfo.rows[0].notificacion_grupo_id;
    console.log('🔍 Grupo ID identificado:', grupoId);

    // Obtener vendedores específicos del body (opcional)
    let vendedorIds: number[] = [];

    try {
      const body = await request.json();
      const rawVendedorIds = body.vendedorIds || [];

      vendedorIds = rawVendedorIds
        .map((id: any) => parseInt(id.toString()))
        .filter((id: number) => !isNaN(id));

      console.log('👥 Vendedores específicos a eliminar:', vendedorIds);
    } catch (e) {
      console.log('❌ No hay vendedores específicos, eliminando todo el grupo');
      vendedorIds = [];
    }

    if (vendedorIds.length > 0) {
      // ELIMINAR PARA USUARIOS ESPECÍFICOS
      const placeholders = vendedorIds.map((_, index) => `$${index + 2}`).join(', ');

      const deleteQuery = `
      DELETE FROM notificaciones 
      WHERE notificacion_grupo_id = $1 AND usuario_id IN (${placeholders})
    `;

      const result = await query(deleteQuery, [grupoId, ...vendedorIds]);
      console.log('✅ Notificaciones eliminadas:', result.rowCount);

      // Verificar cuántas quedan en el grupo
      const remainingResult = await query(
        'SELECT COUNT(*) as count FROM notificaciones WHERE notificacion_grupo_id = $1',
        [grupoId]
      );

      const remainingCount = parseInt(remainingResult.rows[0].count);

      return NextResponse.json({
        success: true,
        deletedCount: result.rowCount,
        remainingCount: remainingCount,
        grupoId: grupoId,
        message: remainingCount === 0
          ? 'Notificación eliminada completamente para todos los usuarios'
          : `Notificación eliminada para ${result.rowCount} usuario(s). Quedan ${remainingCount} pendientes.`
      });
    } else {
      // ELIMINAR TODO EL GRUPO
      const result = await query(
        'DELETE FROM notificaciones WHERE notificacion_grupo_id = $1',
        [grupoId]
      );

      return NextResponse.json({
        success: true,
        deletedCount: result.rowCount,
        grupoId: grupoId,
        message: `Notificación eliminada completamente para todos los usuarios (${result.rowCount} notificaciones)`
      });
    }
  } catch (error) {
    console.error('💥 Error al eliminar notificación:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}