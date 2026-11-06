import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const userId = searchParams.get('userId');

  if (!role || (role !== 'Almacen' && role !== 'Vendedor')) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  if (role === 'Vendedor' && !userId) {
    return NextResponse.json({ error: 'Se requiere userId para vendedor' }, { status: 400 });
  }

  try {
    let result;
    if (role === 'Almacen') {
      result = await query(
        `WITH weeks AS (
           SELECT 
             (DATE_TRUNC('week', fecha))::date as week_start,
             (DATE_TRUNC('week', fecha) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes 59 seconds')::timestamp as week_end
           FROM ventas
           GROUP BY DATE_TRUNC('week', fecha)
           UNION
           SELECT 
             (DATE_TRUNC('week', CURRENT_DATE))::date as week_start,
             (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes 59 seconds')::timestamp as week_end
         )
         SELECT 
           w.week_start,
           w.week_end::date as week_end,
           u.id as vendedor_id,
           u.nombre as vendedor_nombre,
           COALESCE(SUM(
             CASE
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'transferencia' THEN 0
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'mixto' THEN
                 CASE WHEN COALESCE(v.monto_efectivo, 0) = 0 AND COALESCE(v.monto_transferencia, 0) = 0 THEN COALESCE(v.total, 0)
                      ELSE COALESCE(v.monto_efectivo, 0) END
               ELSE COALESCE(v.total, 0)
             END
           ), 0) as total_efectivo,
           COALESCE(SUM(
             CASE
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'transferencia' THEN COALESCE(v.total, 0)
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'mixto' THEN
                 CASE WHEN COALESCE(v.monto_efectivo, 0) = 0 AND COALESCE(v.monto_transferencia, 0) = 0 THEN 0
                      ELSE COALESCE(v.monto_transferencia, 0) END
               ELSE 0
             END
           ), 0) as total_transferencia,
           COALESCE(SUM(
             CASE
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'transferencia' THEN COALESCE(v.total, 0)
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'mixto' THEN
                 CASE WHEN COALESCE(v.monto_efectivo, 0) = 0 AND COALESCE(v.monto_transferencia, 0) = 0 THEN COALESCE(v.total, 0)
                      ELSE (COALESCE(v.monto_efectivo, 0) + COALESCE(v.monto_transferencia, 0)) END
               ELSE COALESCE(v.total, 0)
             END
           ), 0) as total_ventas,
           json_agg(
             json_build_object(
               'id', v.id,
               'producto_id', v.producto,
               'cantidad', v.cantidad,
               'total', v.total,
               'fecha', v.fecha,
               'metodo_pago', v.metodo_pago,
               'monto_efectivo', v.monto_efectivo,
               'monto_transferencia', v.monto_transferencia
             )
           ) FILTER (WHERE v.id IS NOT NULL) as detalles_ventas
         FROM weeks w
         CROSS JOIN usuarios u
         LEFT JOIN ventas v ON v.vendedor::text = u.id::text 
           AND v.fecha >= w.week_start 
           AND v.fecha <= w.week_end
         WHERE u.rol = 'Vendedor'
         GROUP BY w.week_start, w.week_end, u.id, u.nombre
         ORDER BY w.week_start DESC, total_ventas DESC, u.nombre ASC`
      );
    } else {
      result = await query(
        `WITH weeks AS (
           SELECT 
             (DATE_TRUNC('week', fecha))::date as week_start,
             (DATE_TRUNC('week', fecha) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes 59 seconds')::timestamp as week_end
           FROM ventas
           WHERE vendedor::text = $1::text
           GROUP BY DATE_TRUNC('week', fecha)
           UNION
           SELECT 
             (DATE_TRUNC('week', CURRENT_DATE))::date as week_start,
             (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes 59 seconds')::timestamp as week_end
         )
         SELECT 
           w.week_start,
           w.week_end::date as week_end,
           $1::text as vendedor_id,
           COALESCE((SELECT nombre FROM usuarios WHERE id::text = $1::text LIMIT 1), 'Vendedor') as vendedor_nombre,
           COALESCE(SUM(
             CASE
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'transferencia' THEN 0
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'mixto' THEN
                 CASE WHEN COALESCE(v.monto_efectivo, 0) = 0 AND COALESCE(v.monto_transferencia, 0) = 0 THEN COALESCE(v.total, 0)
                      ELSE COALESCE(v.monto_efectivo, 0) END
               ELSE COALESCE(v.total, 0)
             END
           ), 0) as total_efectivo,
           COALESCE(SUM(
             CASE
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'transferencia' THEN COALESCE(v.total, 0)
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'mixto' THEN
                 CASE WHEN COALESCE(v.monto_efectivo, 0) = 0 AND COALESCE(v.monto_transferencia, 0) = 0 THEN 0
                      ELSE COALESCE(v.monto_transferencia, 0) END
               ELSE 0
             END
           ), 0) as total_transferencia,
           COALESCE(SUM(
             CASE
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'transferencia' THEN COALESCE(v.total, 0)
               WHEN LOWER(COALESCE(v.metodo_pago, 'efectivo')) = 'mixto' THEN
                 CASE WHEN COALESCE(v.monto_efectivo, 0) = 0 AND COALESCE(v.monto_transferencia, 0) = 0 THEN COALESCE(v.total, 0)
                      ELSE (COALESCE(v.monto_efectivo, 0) + COALESCE(v.monto_transferencia, 0)) END
               ELSE COALESCE(v.total, 0)
             END
           ), 0) as total_ventas,
           json_agg(
             json_build_object(
               'id', v.id,
               'producto_id', v.producto,
               'cantidad', v.cantidad,
               'total', v.total,
               'fecha', v.fecha,
               'metodo_pago', v.metodo_pago,
               'monto_efectivo', v.monto_efectivo,
               'monto_transferencia', v.monto_transferencia
             )
           ) FILTER (WHERE v.id IS NOT NULL) as detalles_ventas
         FROM weeks w
         LEFT JOIN ventas v ON v.vendedor::text = $1::text
           AND v.fecha >= w.week_start 
           AND v.fecha <= w.week_end
         GROUP BY w.week_start, w.week_end
         ORDER BY w.week_start DESC`,
        [userId]
      );
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas semanales:', error);
    return NextResponse.json({ error: 'Error al obtener ventas semanales' }, { status: 500 });
  }
}
