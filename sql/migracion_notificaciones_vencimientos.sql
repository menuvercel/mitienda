-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: SISTEMA DE NOTIFICACIONES, VENCIMIENTOS Y ROTACIÓN
-- Proyecto: mitienda
-- ==============================================================================

-- 1. Columna 'tiene_vencimiento' en tabla 'productos'
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tiene_vencimiento BOOLEAN DEFAULT FALSE;

-- 2. Columna 'fecha_vencimiento' en tabla 'productos'
ALTER TABLE productos ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE NULL;

-- 3. Columna 'stock_minimo' en tabla 'productos'
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC DEFAULT 0;

-- 4. Columna 'stock_minimo' en tabla 'usuario_productos'
ALTER TABLE usuario_productos ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC DEFAULT 0;

-- 5. Tabla 'notificaciones_vendedores'
CREATE TABLE IF NOT EXISTS notificaciones_vendedores (
  id SERIAL PRIMARY KEY,
  vendedor_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  mensaje TEXT NOT NULL,
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  leido BOOLEAN DEFAULT FALSE
);

-- 6. Tabla 'vigencias_productos' (Sistema de Valoración por Índice de Rotación)
CREATE TABLE IF NOT EXISTS vigencias_productos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad_inicial INT NOT NULL,
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP NULL,
  estado VARCHAR(20) DEFAULT 'activa',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_vigencia_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_vigencia_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- 7. Índices para acelerar el cálculo de rotación y vigencia
CREATE INDEX IF NOT EXISTS idx_vigencias_busqueda ON vigencias_productos (usuario_id, producto_id, estado);
CREATE INDEX IF NOT EXISTS idx_vigencias_fechas ON vigencias_productos (fecha_inicio, fecha_fin);

-- 8. Inicialización automática de vigencias para el inventario activo de los vendedores
INSERT INTO vigencias_productos (usuario_id, producto_id, cantidad_inicial, fecha_inicio, estado)
SELECT up.usuario_id, up.producto_id, up.cantidad, NOW(), 'activa'
FROM usuario_productos up
JOIN usuarios u ON u.id = up.usuario_id AND u.rol = 'Vendedor'
WHERE up.cantidad > 0
  AND NOT EXISTS (
    SELECT 1 FROM vigencias_productos vp 
    WHERE vp.usuario_id = up.usuario_id AND vp.producto_id = up.producto_id AND vp.estado = 'activa'
  );
