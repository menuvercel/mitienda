import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { CalculoContabilidadVendedor } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedorId');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'fechaInicio and fechaFin parameters are required' },
        { status: 400 }
      );
    }

    // Extraer mes y año base del rango
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);
    const mesInicio = startDate.getMonth() + 1;
    const anioInicio = startDate.getFullYear();

    // 1. Obtener vendedores activos (o todos si activo es null)
    let sellersQuery = `SELECT id, nombre, salario, COALESCE(tipo_salario, 'porcentaje') as tipo_salario FROM usuarios WHERE rol = 'Vendedor'`;
    const sellersParams: any[] = [];
    if (vendedorId) {
      sellersQuery += ` AND id = $1`;
      sellersParams.push(parseInt(vendedorId));
    }
    sellersQuery += ` ORDER BY nombre`;

    const sellersResult = await query(sellersQuery, sellersParams);

    // 2. Obtener todas las ventas del rango de fechas
    const salesQuery = `
      SELECT v.id, v.vendedor, v.producto, p.nombre as producto_nombre,
             v.cantidad, v.precio_unitario,
             COALESCE(v.precio_compra, p.precio_compra, 0) as precio_compra,
             v.total, v.fecha,
             COALESCE(v.metodo_pago, 'efectivo') as metodo_pago,
             COALESCE(v.monto_efectivo, 0) as monto_efectivo,
             COALESCE(v.monto_transferencia, 0) as monto_transferencia
      FROM ventas v
      JOIN productos p ON v.producto = p.id
      WHERE DATE(v.fecha) >= DATE($1) AND DATE(v.fecha) <= DATE($2)
      ORDER BY v.fecha DESC
    `;
    const salesResult = await query(salesQuery, [fechaInicio, fechaFin]);

    // 3. Obtener salarios mensuales específicos configurados
    const salariosMensualesResult = await query(
      `SELECT usuario_id, mes, anio, salario FROM salarios_mensuales WHERE anio = $1`,
      [anioInicio]
    );
    const salariosMensualesMap = new Map<string, number>();
    salariosMensualesResult.rows.forEach(sm => {
      salariosMensualesMap.set(`${sm.usuario_id}_${sm.mes}_${sm.anio}`, parseFloat(sm.salario));
    });

    // 4. Obtener todos los gastos de vendedores relevantes para el rango
    const startPeriod = startDate.getFullYear() * 100 + (startDate.getMonth() + 1);
    const endPeriod = endDate.getFullYear() * 100 + (endDate.getMonth() + 1);

    const expensesResult = await query(
      `SELECT id, vendedor_id, nombre, valor, mes, anio, COALESCE(tipo_gasto, 'fijo') as tipo_gasto
       FROM gastos_vendedores
       WHERE (anio * 100 + mes) >= $1 AND (anio * 100 + mes) <= $2`,
      [startPeriod, endPeriod]
    );

    // 5. Obtener mermas del período
    const mermasResult = await query(
      `SELECT m.id, m.cantidad, m.fecha, p.nombre as producto_nombre,
              COALESCE(p.precio_compra, 0) as precio_compra
       FROM merma m
       JOIN productos p ON m.producto_id = p.id
       WHERE DATE(m.fecha) >= DATE($1) AND DATE(m.fecha) <= DATE($2)
       ORDER BY m.fecha DESC`,
      [fechaInicio, fechaFin]
    );

    let totalMermasGlobal = 0;
    const detallesMerma = mermasResult.rows.map(m => {
      const cantidad = parseInt(m.cantidad || '0');
      const precio = parseFloat(m.precio_compra || '0');
      const total = cantidad * precio;
      totalMermasGlobal += total;
      return {
        producto: m.producto_nombre,
        cantidad,
        precio,
        total,
        fecha: m.fecha
      };
    });

    // Generar meses en rango para prorrateo
    const monthsInRange: Array<{ mes: number; anio: number }> = [];
    const curDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (curDate <= endDate) {
      monthsInRange.push({ mes: curDate.getMonth() + 1, anio: curDate.getFullYear() });
      curDate.setMonth(curDate.getMonth() + 1);
    }

    // Factor de período para prorratear salarios fijos mensuales
    let factorPeriodoTotal = 0;
    for (const { mes, anio } of monthsInRange) {
      const monthStart = new Date(anio, mes - 1, 1);
      const monthEnd = new Date(anio, mes, 0);
      const actualStart = new Date(Math.max(monthStart.getTime(), startDate.getTime()));
      const actualEnd = new Date(Math.min(monthEnd.getTime(), endDate.getTime()));
      const diasEnMes = monthEnd.getDate();
      const diasSeleccionados = Math.max(0, Math.floor((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      factorPeriodoTotal += (diasSeleccionados / diasEnMes);
    }

    // 6. Procesar cada vendedor
    const calculations: CalculoContabilidadVendedor[] = [];

    for (const seller of sellersResult.rows) {
      const sid = seller.id.toString();
      const sellerSales = salesResult.rows.filter(s => s.vendedor.toString() === sid);

      let ventaTotal = 0;
      let ventaEfectivo = 0;
      let ventaTransferencia = 0;
      let gananciaBruta = 0;
      let gananciaEfectivo = 0;
      let gananciaTransferencia = 0;

      const ventasDetalle = sellerSales.map(s => {
        const cantidad = parseInt(s.cantidad || '0');
        const precioUnitario = parseFloat(s.precio_unitario || '0');
        const precioCompra = parseFloat(s.precio_compra || '0');
        const total = parseFloat(s.total || '0') || (precioUnitario * cantidad);
        const gananciaProducto = total - (precioCompra * cantidad);

        // Desglose efectivo / transferencia
        let efec = 0;
        let trans = 0;
        const metodo = (s.metodo_pago || 'efectivo').toLowerCase();

        if (metodo === 'transferencia') {
          trans = total;
          efec = 0;
        } else if (metodo === 'mixto') {
          efec = parseFloat(s.monto_efectivo) || 0;
          trans = parseFloat(s.monto_transferencia) || 0;
          if (efec === 0 && trans === 0) efec = total;
        } else {
          // efectivo por defecto
          efec = total;
          trans = 0;
        }

        ventaTotal += total;
        ventaEfectivo += efec;
        ventaTransferencia += trans;
        gananciaBruta += gananciaProducto;

        if (total > 0) {
          gananciaEfectivo += (efec / total) * gananciaProducto;
          gananciaTransferencia += (trans / total) * gananciaProducto;
        } else {
          gananciaEfectivo += gananciaProducto;
        }

        return {
          producto: s.producto_nombre,
          cantidad,
          precioVenta: precioUnitario,
          precioCompra,
          gananciaProducto,
          metodo_pago: metodo,
          monto_efectivo: efec,
          monto_transferencia: trans
        };
      });

      // Gastos prorrateados del vendedor
      const sellerExpenses = expensesResult.rows.filter(e => e.vendedor_id.toString() === sid);
      const gastosDesglosados: Array<{
        nombre: string;
        valorMensual: number;
        diasSeleccionados: number;
        valorProrrateado: number;
        tipo_gasto: 'fijo' | 'variable';
      }> = [];

      let gastosFijos = 0;
      let gastosVariables = 0;

      for (const { mes, anio } of monthsInRange) {
        const monthStart = new Date(anio, mes - 1, 1);
        const monthEnd = new Date(anio, mes, 0);
        const actualStart = new Date(Math.max(monthStart.getTime(), startDate.getTime()));
        const actualEnd = new Date(Math.min(monthEnd.getTime(), endDate.getTime()));
        const diasEnMes = monthEnd.getDate();
        const diasSeleccionados = Math.max(0, Math.floor((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        const mExpenses = sellerExpenses.filter(e => e.mes === mes && e.anio === anio);

        for (const exp of mExpenses) {
          const valorMensual = parseFloat(exp.valor || '0');
          const valorProrrateado = diasEnMes > 0 ? (valorMensual / diasEnMes) * diasSeleccionados : 0;
          const tipo = exp.tipo_gasto === 'variable' ? 'variable' : 'fijo';

          if (tipo === 'variable') {
            gastosVariables += valorProrrateado;
          } else {
            gastosFijos += valorProrrateado;
          }

          const existing = gastosDesglosados.find(g => g.nombre === exp.nombre && g.tipo_gasto === tipo);
          if (existing) {
            existing.valorProrrateado += valorProrrateado;
            existing.diasSeleccionados += diasSeleccionados;
          } else {
            gastosDesglosados.push({
              nombre: exp.nombre,
              valorMensual,
              diasSeleccionados,
              valorProrrateado,
              tipo_gasto: tipo
            });
          }
        }
      }

      const totalGastosVendedor = gastosFijos + gastosVariables;

      // Cálculo de Salario: Porcentaje o Específico Fijo Mensual
      const tipoSalario = seller.tipo_salario === 'fijo_mensual' ? 'fijo_mensual' : 'porcentaje';
      const salarioBaseConfigurado = parseFloat(seller.salario) || 0;
      let salarioCalculado = 0;

      // Buscar si tiene salario mensual específico en la tabla salarios_mensuales para el mes/año
      const salarioMesEspecifico = salariosMensualesMap.get(`${sid}_${mesInicio}_${anioInicio}`);

      if (salarioMesEspecifico !== undefined && salarioMesEspecifico !== null) {
        // Si tiene asignado un salario específico de ese mes, se prorratea por el período
        salarioCalculado = salarioMesEspecifico * factorPeriodoTotal;
      } else if (tipoSalario === 'fijo_mensual') {
        // Fijo mensual del usuario
        salarioCalculado = salarioBaseConfigurado * factorPeriodoTotal;
      } else {
        // Porcentaje sobre ventas (% de ventaTotal)
        salarioCalculado = (ventaTotal * salarioBaseConfigurado) / 100;
      }

      const gastosMerma = 0; // Mermas calculadas a nivel global
      const resultado = gananciaBruta - totalGastosVendedor - salarioCalculado;
      const utilidadFinal = resultado;
      const margenBrutoPct = ventaTotal > 0 ? (gananciaBruta / ventaTotal) * 100 : 0;
      const margenNetoPct = ventaTotal > 0 ? (utilidadFinal / ventaTotal) * 100 : 0;

      calculations.push({
        vendedorId: sid,
        vendedorNombre: seller.nombre,
        tipoSalario,
        salarioPorcentaje: tipoSalario === 'porcentaje' ? salarioBaseConfigurado : undefined,
        salarioFijoMes: tipoSalario === 'fijo_mensual' ? (salarioMesEspecifico ?? salarioBaseConfigurado) : undefined,
        ventaTotal,
        ventaEfectivo,
        ventaTransferencia,
        gananciaBruta,
        gananciaEfectivo,
        gananciaTransferencia,
        gastos: totalGastosVendedor,
        gastosFijos,
        gastosVariables,
        gastosMerma,
        salario: salarioCalculado,
        resultado,
        utilidadFinal,
        margenBrutoPct,
        margenNetoPct,
        detalles: {
          ventas: ventasDetalle,
          gastosDesglosados,
          mermaDesglosada: detallesMerma
        }
      });
    }

    // Responder de forma compatible: si se pide por fetch('/api/contabilidad-vendedores'),
    // admite retornar tanto el objeto con { vendedores, totalMermas } como ser leído directamente
    return NextResponse.json({
      vendedores: calculations,
      totalMermas: totalMermasGlobal
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (error: any) {
    console.error('Error calculando contabilidad de vendedores:', error);
    return NextResponse.json(
      { error: 'Error calculando contabilidad de vendedores', details: error.message },
      { status: 500 }
    );
  }
}
