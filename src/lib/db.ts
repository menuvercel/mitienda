import { sql } from '@vercel/postgres';

let schemaInitialized = false;

export async function ensureDbSchema() {
  if (schemaInitialized) return;
  try {
    await sql.query(`
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) DEFAULT 'efectivo';
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS monto_efectivo NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS monto_transferencia NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(255);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_carnet VARCHAR(50);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(50);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_transaccion VARCHAR(100);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS banco VARCHAR(100);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cuenta_banco_id INTEGER;
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cuenta_nombre VARCHAR(150);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cuenta_numero VARCHAR(100);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS transferencia_id INTEGER REFERENCES registro_transferencias(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_ventas_numero_transaccion ON ventas(numero_transaccion);
      CREATE INDEX IF NOT EXISTS idx_ventas_transferencia_id ON ventas(transferencia_id);

      ALTER TABLE gastos ADD COLUMN IF NOT EXISTS tipo_gasto VARCHAR(20) DEFAULT 'fijo';

      CREATE TABLE IF NOT EXISTS registro_transferencias (
        id SERIAL PRIMARY KEY,
        vendedor_id INTEGER,
        vendedor_nombre VARCHAR(150),
        cliente_nombre VARCHAR(255) NOT NULL,
        cliente_telefono VARCHAR(50) NOT NULL,
        cliente_carnet VARCHAR(50),
        numero_transaccion VARCHAR(100) NOT NULL,
        banco VARCHAR(100) NOT NULL,
        cuenta_banco_id INTEGER,
        cuenta_nombre VARCHAR(150),
        cuenta_numero VARCHAR(100),
        monto NUMERIC(10,2) NOT NULL,
        fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        detalles JSONB DEFAULT '[]'::jsonb,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      ALTER TABLE registro_transferencias ADD COLUMN IF NOT EXISTS cliente_carnet VARCHAR(50);
      ALTER TABLE registro_transferencias ADD COLUMN IF NOT EXISTS cuenta_banco_id INTEGER;
      ALTER TABLE registro_transferencias ADD COLUMN IF NOT EXISTS cuenta_nombre VARCHAR(150);
      ALTER TABLE registro_transferencias ADD COLUMN IF NOT EXISTS cuenta_numero VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_reg_transf_fecha ON registro_transferencias(fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_reg_transf_vendedor ON registro_transferencias(vendedor_id);
      CREATE INDEX IF NOT EXISTS idx_reg_transf_num_transaccion ON registro_transferencias(numero_transaccion);
      CREATE INDEX IF NOT EXISTS idx_reg_transf_carnet ON registro_transferencias(cliente_carnet);

      CREATE TABLE IF NOT EXISTS cuentas_banco (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        banco VARCHAR(100) NOT NULL,
        numero_cuenta VARCHAR(100) NOT NULL,
        activa BOOLEAN DEFAULT true NOT NULL,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recordatorios (
        id SERIAL PRIMARY KEY,
        texto TEXT NOT NULL,
        fecha DATE NOT NULL,
        completado BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON recordatorios(fecha);
      CREATE INDEX IF NOT EXISTS idx_recordatorios_completado ON recordatorios(completado);

      CREATE TABLE IF NOT EXISTS balances (
        id VARCHAR(100) PRIMARY KEY,
        fecha_inicio TIMESTAMP NOT NULL,
        fecha_fin TIMESTAMP NOT NULL,
        ganancia_bruta NUMERIC(10,2) NOT NULL DEFAULT 0,
        gastos JSONB DEFAULT '[]'::jsonb,
        total_gastos NUMERIC(10,2) NOT NULL DEFAULT 0,
        ingresos JSONB DEFAULT '[]'::jsonb,
        total_ingresos NUMERIC(10,2) NOT NULL DEFAULT 0,
        ganancia_neta NUMERIC(10,2) NOT NULL DEFAULT 0,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        cantidad NUMERIC(10,2) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tipo_gasto VARCHAR(20) DEFAULT 'fijo'
      );

      -- Índices para optimización de consultas frecuentes y reducción de transferencias
      CREATE INDEX IF NOT EXISTS idx_transacciones_hacia_fecha ON transacciones(hacia, fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_transacciones_desde_fecha ON transacciones(desde, fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_transacciones_producto ON transacciones(producto);
      CREATE INDEX IF NOT EXISTS idx_transaccion_parametros_tid ON transaccion_parametros(transaccion_id);
      CREATE INDEX IF NOT EXISTS idx_usuario_prod_param_lookup ON usuario_producto_parametros(usuario_id, producto_id);
      CREATE INDEX IF NOT EXISTS idx_prod_param_lookup ON producto_parametros(producto_id);
      CREATE INDEX IF NOT EXISTS idx_productos_barcode ON productos(codigo_barras);
      CREATE INDEX IF NOT EXISTS idx_notificaciones_user_date ON notificaciones(usuario_id, fecha_creacion DESC);
      CREATE INDEX IF NOT EXISTS idx_ventas_fecha_desc ON ventas(fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_ventas_vendedor_fecha ON ventas(vendedor, fecha DESC);
    `);
    schemaInitialized = true;
    console.log('✅ Esquema de base de datos verificado y actualizado.');
  } catch (err) {
    console.error('⚠️ Warning initializing schema (silent fallback):', err);
  }
}

export async function query(text: string, params?: any[]) {
  try {
    if (process.env.RUN_DB_MIGRATIONS === 'true') {
      await ensureDbSchema();
    }
    const result = await sql.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
