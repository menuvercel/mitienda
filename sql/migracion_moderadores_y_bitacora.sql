-- =========================================================================
-- MIGRACIÓN DE BASE DE DATOS: ROL DE MODERADOR, BITÁCORA Y AUDITORÍAS
-- =========================================================================

BEGIN;

-- 1. Asegurar campo 'activo' en la tabla de usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 2. Tabla de Bitácora para auditar acciones de Moderadores
CREATE TABLE IF NOT EXISTS bitacora_moderadores (
    id SERIAL PRIMARY KEY,
    moderador_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    accion VARCHAR(100) NOT NULL,
    detalles TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índice de alto rendimiento para consultas por moderador y fecha
CREATE INDEX IF NOT EXISTS idx_bitacora_moderadores_id_fecha 
ON bitacora_moderadores(moderador_id, fecha DESC);

-- 3. Tabla principal de Inventarios Físicos (Auditorías)
CREATE TABLE IF NOT EXISTS inventarios_fisicos (
    id SERIAL PRIMARY KEY,
    moderador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    vendedor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    punto_venta_nombre VARCHAR(150) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total_items_auditados INTEGER NOT NULL DEFAULT 0,
    total_discrepancias INTEGER NOT NULL DEFAULT 0,
    observaciones TEXT
);

-- 4. Tabla de detalles de cada inventario físico auditado
CREATE TABLE IF NOT EXISTS inventario_fisico_detalles (
    id SERIAL PRIMARY KEY,
    inventario_id INTEGER REFERENCES inventarios_fisicos(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    codigo_barras VARCHAR(100),
    parametro_nombre VARCHAR(100),
    cantidad_sistema NUMERIC(10,2) NOT NULL,
    cantidad_fisica NUMERIC(10,2) NOT NULL,
    diferencia NUMERIC(10,2) NOT NULL,
    precio_compra NUMERIC(10,2) DEFAULT 0,
    precio_venta NUMERIC(10,2) DEFAULT 0
);

-- 5. Índices para agilizar consultas y reportes
CREATE INDEX IF NOT EXISTS idx_inventarios_fisicos_moderador_fecha 
ON inventarios_fisicos(moderador_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_inventarios_fisicos_vendedor_fecha 
ON inventarios_fisicos(vendedor_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_inventario_detalles_inventario_id 
ON inventario_fisico_detalles(inventario_id);

COMMIT;
