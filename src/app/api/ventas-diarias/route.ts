import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha');
  const role = searchParams.get('role');
  const userId = searchParams.get('userId');

  if (!fecha) {
    return NextResponse.json({ error: 'Se requiere la fecha' }, { status: 400 });
  }

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
        `SELECT 
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
               'metodo_pago', v.metodo_pago,
               'monto_efectivo', v.monto_efectivo,
               'monto_transferencia', v.monto_transferencia
             )
           ) FILTER (WHERE v.id IS NOT NULL) as detalles_ventas
         FROM usuarios u
         LEFT JOIN ventas v ON u.id::text = v.vendedor::text AND v.fecha::date = $1::date
         WHERE u.rol = 'Vendedor'
         GROUP BY u.id, u.nombre
         ORDER BY total_ventas DESC, u.nombre ASC`,
        [fecha]
      );
    } else {
      result = await query(
        `SELECT 
           $1::text as vendedor_id,
           COALESCE((SELECT nombre FROM usuarios WHERE id::text = $1::text LIMIT 1), 'Vendedor') as vendedor_nombre,
           COALESCE(SUM(
             CASE
               WHEN LOWER(COALESCE(metodo_pago, 'efectivo')) = 'transferencia' THEN 0
               WHEN LOWER(COALESCE(metodo_pago, 'efectivo')) = 'mixto' THEN
                 CASE WHEN COALESCE(monto_efectivo, 0) = 0 AND COALESCE(monto_transferencia, 0) = 0 THEN COALESCE(total, 0)
                      ELSE COALESCE(monto_efectivo, 0) END
               ELSE COALESCE(total, 0)
             END
           ), 0) as total_efectivo,
           COALESCE(SUM(
             CASE
               WHEN LOWER(COALESCE(metodo_pago, 'efectivo')) = 'transferencia' THEN COALESCE(total, 0)
               WHEN LOWER(COALESCE(metodo_pago, 'efectivo')) = 'mixto' THEN
                 CASE WHEN COALESCE(monto_efectivo, 0) = 0 AND COALESCE(monto_transferencia, 0) = 0 THEN 0
                      ELSE COALESCE(monto_transferencia, 0) END
               ELSE 0
             END
           ), 0) as total_transferencia,
           COALESCE(SUM(
             CASE
               WHEN LOWER(COALESCE(metodo_pago, 'efectivo')) = 'transferencia' THEN COALESCE(total, 0)
               WHEN LOWER(COALESCE(metodo_pago, 'efectivo')) = 'mixto' THEN
                 CASE WHEN COALESCE(monto_efectivo, 0) = 0 AND COALESCE(monto_transferencia, 0) = 0 THEN COALESCE(total, 0)
                      ELSE (COALESCE(monto_efectivo, 0) + COALESCE(monto_transferencia, 0)) END
               ELSE COALESCE(total, 0)
             END
           ), 0) as total_ventas,
           json_agg(
             json_build_object(
               'id', id,
               'producto_id', producto,
               'cantidad', cantidad,
               'total', total,
               'parametros', parametros,
               'metodo_pago', metodo_pago,
               'monto_efectivo', monto_efectivo,
               'monto_transferencia', monto_transferencia
             )
           ) FILTER (WHERE id IS NOT NULL) as detalles_ventas
         FROM ventas
         WHERE vendedor::text = $1::text AND fecha::date = $2::date`,
        [userId, fecha]
      );
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas diarias:', error);
    return NextResponse.json({ error: 'Error al obtener ventas diarias' }, { status: 500 });
  }
}
