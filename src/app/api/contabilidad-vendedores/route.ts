import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ContabilidadVendedor {
  vendedorId: string;
  fechaInicio: string;
  fechaFin: string;
}

interface CalculoVendedor {
  vendedorId: string;
  vendedorNombre: string;
  ventaTotal: number;
  gananciaBruta: number;
  gastos: number;
  salario: number;
  resultado: number;
  detalles: {
    ventas: Array<{
      producto: string;
      cantidad: number;
      precioVenta: number;
      precioCompra: number;
      gananciaProducto: number;
    }>;
    gastosDesglosados: Array<{
      nombre: string;
      valorMensual: number;
      diasSeleccionados: number;
      valorProrrateado: number;
    }>;
  };
}

// GET: Calculate accounting data for sellers in a date range
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

    if (vendedorId) {
      // Calculate for specific seller
      const result = await calculateSellerAccounting(vendedorId, fechaInicio, fechaFin);
      return NextResponse.json(result);
    } else {
      const sellersResult = await query(
        'SELECT id, nombre FROM usuarios WHERE rol = $1 ORDER BY nombre',
        ['Vendedor']
      );

      const calculations = [];
      for (const seller of sellersResult.rows) {
        try {
          const result = await calculateSellerAccounting(seller.id, fechaInicio, fechaFin);
          calculations.push(result);
        } catch (error) {
          console.error(`Error calculating for seller ${seller.id}:`, error);
          calculations.push({
            vendedorId: seller.id,
            vendedorNombre: seller.nombre,
            ventaTotal: 0,
            gananciaBruta: 0,
            gastos: 0,
            salario: 0,
            resultado: 0,
            detalles: { ventas: [], gastosDesglosados: [] },
            error: 'Error calculating'
          });
        }
      }

      // Calculate total mermas for the period
      const totalMermas = await calculateTotalMermas(fechaInicio, fechaFin);

      return NextResponse.json({
        vendedores: calculations,
        totalMermas
      });
    }
  } catch (error) {
    console.error('Error calculating seller accounting:', error);
    return NextResponse.json(
      { error: 'Failed to calculate seller accounting' },
      { status: 500 }
    );
  }
}

async function calculateSellerAccounting(
  vendedorId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<CalculoVendedor> {
  // Get seller name
  const sellerResult = await query(
    'SELECT id, nombre, salario FROM usuarios WHERE id = $1 AND rol = $2',
    [parseInt(vendedorId), 'Vendedor']
  );

  console.log('Looking for seller with ID (converted):', parseInt(vendedorId));
  console.log('Seller query result:', sellerResult.rows);

  if (sellerResult.rows.length === 0) {
    throw new Error(`Seller with ID ${vendedorId} not found`);
  }

  const seller = sellerResult.rows[0];
  const salaryPercentage = parseFloat(seller.salario) || 0;

  // 🔥 SOLUCIÓN DEFINITIVA: Comparar solo las fechas, ignorando las horas
  const salesResult = await query(
    `SELECT p.nombre, v.cantidad, v.precio_unitario, COALESCE(v.precio_compra, p.precio_compra) as precio_compra, v.fecha
     FROM ventas v
     LEFT JOIN productos p ON v.producto = p.id
     WHERE v.vendedor = $1
     AND DATE(v.fecha) >= DATE($2)
     AND DATE(v.fecha) <= DATE($3)
     ORDER BY v.fecha`,
    [parseInt(vendedorId), fechaInicio, fechaFin]
  );

  console.log('📅 Búsqueda de ventas:');
  console.log('  Desde:', fechaInicio);
  console.log('  Hasta:', fechaFin);
  console.log('  Ventas encontradas:', salesResult.rows.length);
  console.log('Sales query result for vendor', vendedorId, ':', salesResult.rows);

  // Calculate total sales and gross profit
  let ventaTotal = 0;
  let gananciaBruta = 0;
  const ventasDetalle: Array<{
    producto: string;
    cantidad: number;
    precioVenta: number;
    precioCompra: number;
    gananciaProducto: number;
  }> = [];

  for (const sale of salesResult.rows) {
    console.log('Processing sale:', sale);
    const precioCompra = parseFloat(sale.precio_compra || '0') || 0;
    const cantidad = parseInt(sale.cantidad || '0');
    const precioVenta = parseFloat(sale.precio_unitario || '0') || 0;
    const gananciaProducto = (precioVenta - precioCompra) * cantidad;

    ventaTotal += precioVenta * cantidad;
    gananciaBruta += gananciaProducto;

    ventasDetalle.push({
      producto: sale.nombre,
      cantidad,
      precioVenta,
      precioCompra,
      gananciaProducto
    });
  }

  // Calculate prorated expenses
  const gastosDesglosados = await getProratedExpenses(
    vendedorId,
    fechaInicio,
    fechaFin
  );
  const gastos = gastosDesglosados.reduce((total, gasto) => total + gasto.valorProrrateado, 0);

  // Calculate salary
  const salario = (ventaTotal * salaryPercentage) / 100;

  // Calculate final result
  const resultado = gananciaBruta - gastos - salario;

  return {
    vendedorId,
    vendedorNombre: seller.nombre,
    ventaTotal,
    gananciaBruta,
    gastos,
    salario,
    resultado,
    detalles: {
      ventas: ventasDetalle,
      gastosDesglosados
    }
  };
}



async function getProratedExpenses(
  vendedorId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<Array<{
  nombre: string;
  valorMensual: number;
  diasSeleccionados: number;
  valorProrrateado: number;
}>> {
  // Get the month and year of the selected period
  const startDate = new Date(fechaInicio);
  const endDate = new Date(fechaFin);

  // Get all months in the range
  const monthsInRange: Array<{ mes: number; anio: number }> = [];
  const current = new Date(startDate);
  current.setDate(1); // Start from first day of month

  while (current <= endDate) {
    monthsInRange.push({
      mes: current.getMonth() + 1,
      anio: current.getFullYear()
    });
    current.setMonth(current.getMonth() + 1);
  }

  const proratedExpenses: Array<{
    nombre: string;
    valorMensual: number;
    diasSeleccionados: number;
    valorProrrateado: number;
  }> = [];

  // Fetch all expenses for this seller in the relevant months at once
  const startPeriod = startDate.getFullYear() * 100 + (startDate.getMonth() + 1);
  const endPeriod = endDate.getFullYear() * 100 + (endDate.getMonth() + 1);

  const expensesResult = await query(
    `SELECT nombre, valor, mes, anio 
     FROM gastos_vendedores 
     WHERE vendedor_id = $1 
     AND (anio * 100 + mes) >= $2 
     AND (anio * 100 + mes) <= $3`,
    [parseInt(vendedorId), startPeriod, endPeriod]
  );

  for (const { mes, anio } of monthsInRange) {
    // Get days in this month within the selected range
    const monthStart = new Date(anio, mes - 1, 1);
    const monthEnd = new Date(anio, mes, 0); // Last day of month
    const actualStart = new Date(Math.max(monthStart.getTime(), startDate.getTime()));
    const actualEnd = new Date(Math.min(monthEnd.getTime(), endDate.getTime()));

    const diasEnMes = monthEnd.getDate();
    const diasSeleccionados = Math.floor((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Filter expenses for this specific month from the pre-fetched result
    const monthExpenses = expensesResult.rows.filter(e => e.mes === mes && e.anio === anio);

    for (const expense of monthExpenses) {
      const valorMensual = parseFloat(expense.valor);
      const valorProrrateado = (valorMensual / diasEnMes) * diasSeleccionados;

      // Find existing expense or add new one
      const existingIndex = proratedExpenses.findIndex(e => e.nombre === expense.nombre);
      if (existingIndex >= 0) {
        proratedExpenses[existingIndex].valorProrrateado += valorProrrateado;
        proratedExpenses[existingIndex].diasSeleccionados += diasSeleccionados;
      } else {
        proratedExpenses.push({
          nombre: expense.nombre,
          valorMensual,
          diasSeleccionados,
          valorProrrateado
        });
      }
    }
  }

  return proratedExpenses;
}

async function calculateTotalMermas(fechaInicio: string, fechaFin: string): Promise<number> {
  const mermasResult = await query(
    `SELECT m.cantidad, p.precio 
     FROM merma m
     JOIN productos p ON m.producto_id = p.id
     WHERE DATE(m.fecha) >= DATE($1)
     AND DATE(m.fecha) <= DATE($2)`,
    [fechaInicio, fechaFin]
  );

  let totalMermas = 0;
  for (const row of mermasResult.rows) {
    const cantidad = parseInt(row.cantidad || '0');
    const precio = parseFloat(row.precio || '0');
    totalMermas += cantidad * precio;
  }

  return totalMermas;
}
