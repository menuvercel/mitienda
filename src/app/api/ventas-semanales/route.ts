import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded || (decoded.rol !== 'Almacen' && decoded.rol !== 'Vendedor')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    let result;
    if (decoded.rol === 'Almacen') {
      // Para el rol Almacen, obtener ventas de todos los vendedores
      result = await query(
        `WITH weeks AS (
           SELECT 
             (DATE_TRUNC('week', fecha))::date as week_start,  -- Calculamos el primer día de la semana (lunes)
             (DATE_TRUNC('week', fecha) + INTERVAL '6 days')::date as week_end  -- Calculamos el último día de la semana (domingo)
           FROM ventas
           GROUP BY DATE_TRUNC('week', fecha)
         )
         SELECT 
           w.week_start,
           w.week_end,
           u.id as vendedor_id,
           u.nombre as vendedor_nombre,
           COALESCE(SUM(v.total), 0) as total_ventas
         FROM weeks w
         CROSS JOIN usuarios u
         LEFT JOIN ventas v ON v.vendedor = u.id 
           AND v.fecha >= w.week_start 
           AND v.fecha <= w.week_end
         WHERE u.rol = 'Vendedor'
         GROUP BY w.week_start, w.week_end, u.id, u.nombre
         ORDER BY w.week_start DESC, total_ventas DESC`
      );
    } else {
      // Para el rol Vendedor, obtener solo sus propias ventas
      result = await query(
        `WITH weeks AS (
           SELECT 
             (DATE_TRUNC('week', fecha))::date as week_start,  -- Calculamos el primer día de la semana (lunes)
             (DATE_TRUNC('week', fecha) + INTERVAL '6 days')::date as week_end  -- Calculamos el último día de la semana (domingo)
           FROM ventas
           WHERE vendedor = $1
           GROUP BY DATE_TRUNC('week', fecha)
         )
         SELECT 
           w.week_start,
           w.week_end,
           $1::uuid as vendedor_id,
           $2::text as vendedor_nombre,
           COALESCE(SUM(v.total), 0) as total_ventas
         FROM weeks w
         LEFT JOIN ventas v ON v.vendedor = $1
           AND v.fecha >= w.week_start 
           AND v.fecha <= w.week_end
         GROUP BY w.week_start, w.week_end
         ORDER BY w.week_start DESC`
        , [decoded.id, decoded.rol]
      );
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas semanales:', error);
    return NextResponse.json({ error: 'Error al obtener ventas semanales' }, { status: 500 });
  }
}
