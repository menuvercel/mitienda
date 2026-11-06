import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vendedorId = params.id;
    
    // Obtener productos y sus parámetros en UNA SOLA consulta eficiente (evita N+1 queries)
    const productosResult = await query(
      `SELECT
        p.id,
        p.nombre,
        p.precio,
        p.precio_compra,
        p.foto,
        p.tiene_parametros,
        p.valor_compra_usd,
        p.precio_compra_usd,
        p.precio_venta_usd,
        p.codigo_barras,
        up.cantidad,
        CASE 
          WHEN p.tiene_parametros THEN
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'nombre', upp.nombre,
                    'cantidad', upp.cantidad,
                    'foto', pp.foto,
                    'codigo_barras', pp.codigo_barras
                  )
                )
                FROM usuario_producto_parametros upp
                LEFT JOIN producto_parametros pp ON upp.producto_id = pp.producto_id AND upp.nombre = pp.nombre
                WHERE upp.usuario_id = up.usuario_id AND upp.producto_id = p.id
              ),
              '[]'::json
            )
          ELSE NULL
        END as parametros
       FROM productos p
       JOIN usuario_productos up ON p.id = up.producto_id
       WHERE up.usuario_id = $1`,
      [vendedorId]
    );

    const productosConParametros = productosResult.rows.map((p) => {
      if (p.tiene_parametros) {
        return {
          ...p,
          parametros: p.parametros || []
        };
      }
      const { parametros, ...rest } = p;
      return rest;
    });

    return NextResponse.json(productosConParametros);
  } catch (error) {
    console.error('Error al obtener productos del vendedor:', error);
    return NextResponse.json({ error: 'Error al obtener productos del vendedor' }, { status: 500 });
  }
}