// export-ventas.js
const { sql } = require('@vercel/postgres');
const fs = require('fs').promises;

// Configura aquí tu URL de conexión de Vercel
const POSTGRES_URL = 'postgres://default:WTiXlvrRDb71@ep-aged-wind-a4pz2ygu-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require';

async function exportVentas() {
  try {
    // Configurar la conexión
    process.env.POSTGRES_URL = POSTGRES_URL;
    
    const result = await sql.query(`
      SELECT id, producto, cantidad, precio_unitario, total, vendedor, fecha
      FROM ventas
      ORDER BY fecha DESC
    `);
    
    const ventas = result.rows;
    
    // Exportar como SQL con formato de fecha MySQL
    let sqlContent = 'INSERT INTO ventas (id, producto, cantidad, precio_unitario, total, vendedor, fecha) VALUES\n';
    const values = ventas.map(venta => {
      // Convertir la fecha al formato 'YYYY-MM-DD HH:mm:ss'
      const fecha = new Date(venta.fecha);
      const fechaFormateada = fecha.getFullYear() + '-' +
        String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
        String(fecha.getDate()).padStart(2, '0') + ' ' +
        String(fecha.getHours()).padStart(2, '0') + ':' +
        String(fecha.getMinutes()).padStart(2, '0') + ':' +
        String(fecha.getSeconds()).padStart(2, '0');
        
      return `(${venta.id}, ${venta.producto}, ${venta.cantidad}, ${venta.precio_unitario}, ${venta.total}, ${venta.vendedor}, '${fechaFormateada}')`
    }).join(',\n');
    
    sqlContent += values + ';';
    
    await fs.writeFile('ventas_export.sql', sqlContent);
    console.log('Datos exportados exitosamente a ventas_export.sql');
    
    // Exportar como CSV con el mismo formato de fecha
    const csvHeader = 'id,producto,cantidad,precio_unitario,total,vendedor,fecha\n';
    const csvContent = ventas.map(venta => {
      const fecha = new Date(venta.fecha);
      const fechaFormateada = fecha.getFullYear() + '-' +
        String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
        String(fecha.getDate()).padStart(2, '0') + ' ' +
        String(fecha.getHours()).padStart(2, '0') + ':' +
        String(fecha.getMinutes()).padStart(2, '0') + ':' +
        String(fecha.getSeconds()).padStart(2, '0');
      
      return `${venta.id},${venta.producto},${venta.cantidad},${venta.precio_unitario},${venta.total},${venta.vendedor},"${fechaFormateada}"`
    }).join('\n');
    
    await fs.writeFile('ventas_export.csv', csvHeader + csvContent);
    console.log('Datos exportados exitosamente a ventas_export.csv');
    
    // Exportar como JSON
    const jsonContent = JSON.stringify(ventas.map(venta => {
      const fecha = new Date(venta.fecha);
      const fechaFormateada = fecha.getFullYear() + '-' +
        String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
        String(fecha.getDate()).padStart(2, '0') + ' ' +
        String(fecha.getHours()).padStart(2, '0') + ':' +
        String(fecha.getMinutes()).padStart(2, '0') + ':' +
        String(fecha.getSeconds()).padStart(2, '0');
      
      return {
        ...venta,
        fecha: fechaFormateada
      };
    }), null, 2);
    
    await fs.writeFile('ventas_export.json', jsonContent);
    console.log('Datos exportados exitosamente a ventas_export.json');
    
    // Generar reporte de resumen
    const totalVentas = ventas.length;
    const montoTotal = ventas.reduce((sum, venta) => sum + Number(venta.total), 0);
    const resumen = {
      total_registros: totalVentas,
      monto_total: montoTotal,
      fecha_exportacion: new Date().toISOString().replace('T', ' ').replace('Z', '')
    };
    
    await fs.writeFile('ventas_resumen.json', JSON.stringify(resumen, null, 2));
    console.log('Resumen exportado exitosamente a ventas_resumen.json');
    
  } catch (error) {
    console.error('Error exportando datos:', error);
  }
  process.exit();
}

exportVentas();