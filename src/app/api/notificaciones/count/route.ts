import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 1. Conteo de vencimientos (vencido o vence pronto <= 7 dias)
    let vencimientosSummary: any[] = [];
    try {
      const resVencimientos = await query(`
        SELECT 
          id, 
          estado,
          fecha_vencimiento
        FROM (
          SELECT 
            p.id,
            p.fecha_vencimiento,
            CASE 
              WHEN p.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
              WHEN p.fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' THEN 'vence_pronto'
              ELSE 'vigente'
            END as estado,
            COALESCE(
              CASE 
                WHEN p.tiene_parametros = true THEN (
                  SELECT SUM(pp.cantidad) 
                  FROM producto_parametros pp 
                  WHERE pp.producto_id = p.id
                )
                ELSE p.cantidad
              END, 
              0
            ) as cantidad
          FROM productos p
          WHERE p.tiene_vencimiento = true AND p.fecha_vencimiento IS NOT NULL
        ) sub
        WHERE estado IN ('vencido', 'vence_pronto') AND cantidad > 0
      `);
      vencimientosSummary = resVencimientos.rows;
    } catch (err) {
      console.warn('DB notification count warning (vencimientos):', err);
    }

    // 2. Conteo de almacén (Agotados y Bajo Stock en Inventario Central)
    let almacenSummary: any[] = [];
    try {
      const resAlmacen = await query(`
        SELECT 
          p.id as producto_id,
          CASE 
            WHEN (
              COALESCE(
                CASE 
                  WHEN p.tiene_parametros = true THEN (
                    SELECT SUM(pp.cantidad) 
                    FROM producto_parametros pp 
                    WHERE pp.producto_id = p.id
                  )
                  ELSE p.cantidad
                END, 
                0
              )
            ) = 0 THEN 'agotado'
            ELSE 'bajo_stock'
          END as estado,
          COALESCE(
            CASE 
              WHEN p.tiene_parametros = true THEN (
                SELECT SUM(pp.cantidad) 
                FROM producto_parametros pp 
                WHERE pp.producto_id = p.id
              )
              ELSE p.cantidad
            END, 
            0
          ) as cantidad
        FROM productos p
        WHERE (
          COALESCE(
            CASE 
              WHEN p.tiene_parametros = true THEN (
                SELECT SUM(pp.cantidad) 
                FROM producto_parametros pp 
                WHERE pp.producto_id = p.id
              )
              ELSE p.cantidad
            END, 
            0
          ) = 0
          OR (
            COALESCE(p.stock_minimo, 0) > 0 
            AND COALESCE(
              CASE 
                WHEN p.tiene_parametros = true THEN (
                  SELECT SUM(pp.cantidad) 
                  FROM producto_parametros pp 
                  WHERE pp.producto_id = p.id
                )
                ELSE p.cantidad
              END, 
              0
            ) <= p.stock_minimo
          )
        )
      `);

      almacenSummary = resAlmacen.rows;
    } catch (err) {
      console.warn('DB notification count warning (almacen):', err);
    }

    // 3. Conteo de vendedores (Agotados y Bajo Stock en Puntos de Venta)
    let vendedoresSummary: any[] = [];
    try {
      const resVendedores = await query(`
        SELECT 
          u.id as usuario_id,
          p.id as producto_id,
          CASE 
            WHEN (
              COALESCE(
                CASE 
                  WHEN p.tiene_parametros = true THEN (
                    SELECT SUM(upp.cantidad) 
                    FROM usuario_producto_parametros upp 
                    WHERE upp.producto_id = p.id AND upp.usuario_id = u.id
                  )
                  ELSE up.cantidad
                END, 
                0
              )
            ) = 0 THEN 'agotado'
            ELSE 'bajo_stock'
          END as estado
        FROM usuarios u
        JOIN (
          SELECT DISTINCT usuario_id, producto_id FROM (
            SELECT usuario_id, producto_id FROM usuario_productos
            UNION
            SELECT usuario_id, producto_id FROM usuario_producto_parametros
          ) sub_asig
        ) asig ON asig.usuario_id = u.id
        JOIN productos p ON p.id = asig.producto_id
        LEFT JOIN usuario_productos up ON up.usuario_id = asig.usuario_id AND up.producto_id = asig.producto_id
        WHERE u.rol = 'Vendedor' AND u.activo = true
          AND (
            COALESCE(
              CASE 
                WHEN p.tiene_parametros = true THEN (
                  SELECT SUM(upp.cantidad) 
                  FROM usuario_producto_parametros upp 
                  WHERE upp.producto_id = p.id AND upp.usuario_id = u.id
                )
                ELSE up.cantidad
              END, 
              0
            ) = 0
            OR (
              COALESCE(p.stock_minimo, 0) > 0 
              AND COALESCE(
                CASE 
                  WHEN p.tiene_parametros = true THEN (
                    SELECT SUM(upp.cantidad) 
                    FROM usuario_producto_parametros upp 
                    WHERE upp.producto_id = p.id AND upp.usuario_id = u.id
                  )
                  ELSE up.cantidad
                END, 
                0
              ) <= p.stock_minimo
            )
          )
      `);

      vendedoresSummary = resVendedores.rows;
    } catch (err) {
      console.warn('DB notification count warning (vendedores):', err);
    }

    return NextResponse.json({
      vencimientos: vencimientosSummary,
      almacen: almacenSummary,
      vendedores: vendedoresSummary
    });

  } catch (error) {
    console.error('Error fetching notification counts:', error);
    return NextResponse.json({ error: 'Error al obtener conteo' }, { status: 500 });
  }
}
