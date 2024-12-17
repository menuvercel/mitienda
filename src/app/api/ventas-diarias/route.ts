import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded || (decoded.rol !== 'Almacen' && decoded.rol !== 'Vendedor')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha');

  if (!fecha) {
    return NextResponse.json({ error: 'Se requiere la fecha' }, { status: 400 });
  }

  try {
    let result;
    if (decoded.rol === 'Almacen') {
      result = await query(
        `SELECT 
           u.id as vendedor_id,
           u.nombre as vendedor_nombre,
           COALESCE(SUM(v.total), 0) as total_ventas,
           json_agg(
             json_build_object(
               'id', v.id,
               'producto_id', v.producto,
               'cantidad', v.cantidad,
               'total', v.total,
               'parametros', v.parametros
             )
           ) FILTER (WHERE v.id IS NOT NULL) as detalles_ventas
         FROM usuarios u
         LEFT JOIN ventas v ON u.id = v.vendedor AND v.fecha::date = $1::date
         WHERE u.rol = 'Vendedor'
         GROUP BY u.id, u.nombre
         ORDER BY total_ventas DESC`,
        [fecha]
      );
    } else {
      result = await query(
        `SELECT 
           $1::uuid as vendedor_id,
           $2::text as vendedor_nombre,
           COALESCE(SUM(total), 0) as total_ventas,
           json_agg(
             json_build_object(
               'id', id,
               'producto_id', producto,
               'cantidad', cantidad,
               'total', total,
               'parametros', parametros
             )
           ) FILTER (WHERE id IS NOT NULL) as detalles_ventas
         FROM ventas
         WHERE vendedor = $1 AND fecha::date = $3::date`,
        [decoded.id, decoded.rol, fecha]
      );
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas diarias:', error);
    return NextResponse.json({ error: 'Error al obtener ventas diarias' }, { status: 500 });
  }
}
