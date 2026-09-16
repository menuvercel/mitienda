import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs: string[] = [];

  try {
    // 1. Tabla salarios_mensuales
    await query(`
      CREATE TABLE IF NOT EXISTS salarios_mensuales (
        id SERIAL PRIMARY KEY,
        usuario_id TEXT NOT NULL,
        mes INTEGER NOT NULL,
        anio INTEGER NOT NULL,
        salario NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (usuario_id, mes, anio)
      )
    `);
    logs.push('✅ Tabla salarios_mensuales asegurada / creada.');

    // 2. Columna tipo_salario en usuarios
    const checkTipoSalario = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND column_name = 'tipo_salario'
    `);
    if (checkTipoSalario.rows.length === 0) {
      await query(`ALTER TABLE usuarios ADD COLUMN tipo_salario VARCHAR(50) DEFAULT 'porcentaje'`);
      logs.push('✅ Columna tipo_salario agregada a usuarios.');
    } else {
      logs.push('ℹ️ Columna tipo_salario ya existía en usuarios.');
    }

    // 3. Columna tipo_gasto en gastos_vendedores
    const checkTipoGasto = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'gastos_vendedores' AND column_name = 'tipo_gasto'
    `);
    if (checkTipoGasto.rows.length === 0) {
      await query(`ALTER TABLE gastos_vendedores ADD COLUMN tipo_gasto VARCHAR(20) DEFAULT 'fijo'`);
      logs.push('✅ Columna tipo_gasto agregada a gastos_vendedores.');
    } else {
      logs.push('ℹ️ Columna tipo_gasto ya existía en gastos_vendedores.');
    }

    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error: any) {
    console.error('Error en migración contabilidad:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      logs
    }, { status: 500 });
  }
}
