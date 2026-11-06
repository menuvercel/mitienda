import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCached, setCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const NOTIF_CACHE_KEY = 'api_notificaciones_summary';
const NOTIF_CACHE_TTL = 60; // 60 segundos en memoria para evitar consultas repetitivas de campanas y pestañas

async function safeQuery(sqlText: string, params: any[] = []): Promise<any[]> {
  try {
    const res = await query(sqlText, params);
    return res.rows || [];
  } catch (err: any) {
    console.warn('safeQuery caught warning:', err?.message || err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const cached = getCached<any>(NOTIF_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const [
      vencimientosRows,
      almacenRows,
      vendedorItemsRows,
      rotacionRows,
      rankingRows,
      recordatoriosRows,
      vendorsRows
    ] = await Promise.all([
      // 1. Vencimientos (solo con vencimiento activo)
      safeQuery(`
        SELECT 
          p.id, p.nombre, p.foto,
          p.cantidad,
          'General' as seccion,
          p.tiene_vencimiento, 
          TO_CHAR(p.fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento
        FROM productos p
        WHERE p.tiene_vencimiento = true 
          AND p.fecha_vencimiento IS NOT NULL
          AND p.cantidad > 0
        ORDER BY p.fecha_vencimiento ASC
      `),

      // 2. Almacén (inventario central: solo agotados y bajo stock)
      safeQuery(`
        SELECT 
          p.id as producto_id,
          p.id,
          p.nombre,
          p.foto,
          'Almacén General' as ubicacion,
          p.cantidad,
          COALESCE(p.stock_minimo, 0) as stock_minimo,
          CASE WHEN p.cantidad = 0 THEN 'agotado' ELSE 'bajo_stock' END as estado
        FROM productos p
        WHERE p.cantidad = 0 OR (p.stock_minimo > 0 AND p.cantidad <= p.stock_minimo)
        ORDER BY p.cantidad ASC, p.nombre ASC
      `),

      // 3. Puntos de venta: artículos críticos
      safeQuery(`
        SELECT 
          u.id as usuario_id,
          u.nombre as usuario_nombre,
          u.telefono as usuario_telefono,
          p.id as producto_id,
          p.nombre as producto_nombre,
          p.foto as producto_foto,
          COALESCE(up.cantidad, 0) as cantidad,
          COALESCE(p.stock_minimo, 0) as stock_minimo
        FROM usuarios u
        JOIN usuario_productos up ON up.usuario_id = u.id
        JOIN productos p ON p.id = up.producto_id
        WHERE u.rol = 'Vendedor' AND u.activo = true
          AND (up.cantidad = 0 OR (p.stock_minimo > 0 AND up.cantidad <= p.stock_minimo))
        ORDER BY u.nombre ASC, p.nombre ASC
      `),

      // 4. Índice de rotación optimizado con CTE (ventas agregadas)
      safeQuery(`
        WITH upp_agg AS (
          SELECT usuario_id, producto_id, SUM(cantidad) AS cant_parametros
          FROM usuario_producto_parametros
          GROUP BY usuario_id, producto_id
        ),
        ventas_agg AS (
          SELECT v.vendedor, v.producto, SUM(v.cantidad) AS unidades_vendidas
          FROM ventas v
          JOIN usuario_productos up ON up.usuario_id = v.vendedor AND up.producto_id = v.producto
          WHERE v.fecha >= COALESCE(up.vigencia_inicio, '2020-01-01'::timestamp)
            AND v.fecha <= COALESCE(up.vigencia_fin, NOW())
          GROUP BY v.vendedor, v.producto
        )
        SELECT 
          u.id AS vendedor_id,
          u.nombre AS vendedor_nombre,
          p.id AS producto_id,
          p.nombre AS producto_nombre,
          p.foto AS producto_foto,
          COALESCE(
            CASE WHEN p.tiene_parametros = true THEN upp.cant_parametros ELSE up.cantidad END,
            0
          ) AS stock_actual,
          up.vigencia_inicio,
          up.vigencia_fin,
          CASE 
            WHEN COALESCE(CASE WHEN p.tiene_parametros = true THEN upp.cant_parametros ELSE up.cantidad END, 0) > 0 THEN 'activa'
            ELSE 'agotada'
          END AS estado_vigencia,
          ROUND(
            GREATEST(
              EXTRACT(EPOCH FROM (COALESCE(up.vigencia_fin, NOW()) - COALESCE(up.vigencia_inicio, NOW()))) / 86400.0,
              0.1
            )::numeric, 1
          ) AS dias_vigencia,
          COALESCE(va.unidades_vendidas, 0) AS unidades_vendidas,
          ROUND(
            (
              COALESCE(va.unidades_vendidas, 0) / 
              GREATEST(
                EXTRACT(EPOCH FROM (COALESCE(up.vigencia_fin, NOW()) - COALESCE(up.vigencia_inicio, NOW()))) / 86400.0,
                0.1
              )
            )::numeric, 2
          ) AS indice_rotacion_diaria
        FROM usuario_productos up
        JOIN usuarios u ON u.id = up.usuario_id AND u.rol = 'Vendedor'
        JOIN productos p ON p.id = up.producto_id
        LEFT JOIN upp_agg upp ON upp.usuario_id = up.usuario_id AND upp.producto_id = up.producto_id
        LEFT JOIN ventas_agg va ON va.vendedor = up.usuario_id AND va.producto = up.producto_id
        WHERE COALESCE(va.unidades_vendidas, 0) > 0 
           OR COALESCE(CASE WHEN p.tiene_parametros = true THEN upp.cant_parametros ELSE up.cantidad END, 0) > 0
        ORDER BY indice_rotacion_diaria DESC, unidades_vendidas DESC
      `),

      // 5. Ranking de vendedores
      safeQuery(`
        SELECT 
          u.id as vendedor_id,
          u.nombre as vendedor_nombre,
          COALESCE(SUM(v.cantidad), 0) as unidades_vendidas,
          COALESCE(SUM(v.total), 0) as monto_total
        FROM usuarios u
        LEFT JOIN ventas v ON v.vendedor = u.id
        WHERE u.rol = 'Vendedor' AND u.activo = true
        GROUP BY u.id, u.nombre
        ORDER BY monto_total DESC
      `),

      // 6. Recordatorios
      safeQuery(`
        SELECT 
          id, 
          texto, 
          TO_CHAR(fecha, 'YYYY-MM-DD') as fecha,
          completado,
          fecha_creacion
        FROM recordatorios
        WHERE completado = false AND fecha <= CURRENT_DATE
        ORDER BY fecha ASC
      `),

      // 7. Lista de todos los vendedores activos
      safeQuery(`
        SELECT id, nombre 
        FROM usuarios 
        WHERE rol = 'Vendedor' AND activo = true 
        ORDER BY nombre ASC
      `)
    ]);

    // Procesar vencimientos
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vencimientos = vencimientosRows.map((p) => {
      const fVenc = new Date(p.fecha_vencimiento + 'T00:00:00');
      const diffMs = fVenc.getTime() - hoy.getTime();
      const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let estado: 'vencido' | 'vence_pronto' | 'vigente' = 'vigente';
      if (diffDias < 0) {
        estado = 'vencido';
      } else if (diffDias <= 7) {
        estado = 'vence_pronto';
      }

      return {
        ...p,
        dias_diferencia: Math.abs(diffDias),
        estado
      };
    });

    // Procesar alertas de almacén
    const alertasAlmacen = almacenRows.map((row) => ({
      ...row,
      cantidad: Number(row.cantidad),
      stock_minimo: Number(row.stock_minimo)
    }));

    // Procesar alertas de vendedores
    const vendorMap = new Map<string, any>();
    for (const row of vendedorItemsRows) {
      const cant = Number(row.cantidad);
      const stMin = Number(row.stock_minimo);
      let estado: 'agotado' | 'bajo_stock' = cant === 0 ? 'agotado' : 'bajo_stock';

      const vId = String(row.usuario_id);
      if (!vendorMap.has(vId)) {
        vendorMap.set(vId, {
          vendedor_id: vId,
          vendedor_nombre: row.usuario_nombre,
          vendedor_telefono: row.usuario_telefono,
          total_agotados: 0,
          total_bajo_stock: 0,
          productos_criticos: []
        });
      }

      const vObj = vendorMap.get(vId);
      if (estado === 'agotado') vObj.total_agotados++;
      else vObj.total_bajo_stock++;

      vObj.productos_criticos.push({
        id: row.producto_id,
        nombre: row.producto_nombre,
        cantidad: cant,
        stock_minimo: stMin,
        estado
      });
    }

    const vendedoresAlertas = Array.from(vendorMap.values());

    // Procesar rotación de productos
    const rotacionProductos = rotacionRows.map((row) => {
      const unidadesVendidas = Number(row.unidades_vendidas);
      const stockActual = Number(row.stock_actual);
      const indice = Number(row.indice_rotacion_diaria);
      return {
        vendedor_id: String(row.vendedor_id),
        vendedor_nombre: row.vendedor_nombre,
        producto_id: row.producto_id,
        producto_nombre: row.producto_nombre,
        producto_foto: row.producto_foto,
        unidades_entregadas: stockActual + unidadesVendidas,
        stock_actual: stockActual,
        dias_vigencia: Number(row.dias_vigencia),
        unidades_vendidas: unidadesVendidas,
        indice_rotacion_diaria: indice,
        estado_vigencia: row.estado_vigencia,
        evaluacion: indice >= 1.5 ? 'Alta Rotación' : indice >= 0.4 ? 'Rotación Media' : 'Baja Rotación'
      };
    });

    // Productos estrella y estancados (primeros 15 para rápido payload)
    const productosEstrella = rotacionProductos.filter(r => r.evaluacion === 'Alta Rotación').slice(0, 15);
    const productosEstancados = rotacionProductos.filter(r => r.evaluacion === 'Baja Rotación').slice(0, 15);

    // Ranking de vendedores
    const rankingVendedores = rankingRows.map((row, idx) => ({
      vendedor_id: String(row.vendedor_id),
      vendedor_nombre: row.vendedor_nombre,
      unidades_vendidas: Number(row.unidades_vendidas),
      monto_total: Number(row.monto_total),
      rank: idx + 1
    }));

    // Lista de vendedores
    const listaVendedores = vendorsRows.map((r: any) => ({
      id: String(r.id),
      nombre: r.nombre
    }));

    const payload = {
      vencimientos,
      almacen: alertasAlmacen,
      recordatorios: recordatoriosRows,
      vendedores: {
        lista: listaVendedores,
        alertas: vendedoresAlertas,
        rotacionProductos,
        productosEstrella,
        productosEstancados,
        rankingVendedores
      }
    };

    setCached(NOTIF_CACHE_KEY, payload, NOTIF_CACHE_TTL);

    return NextResponse.json(payload);

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}
