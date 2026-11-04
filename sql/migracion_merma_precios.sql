-- Migración: Guardar precio histórico y precio de compra en merma
ALTER TABLE merma ADD COLUMN IF NOT EXISTS precio numeric;
ALTER TABLE merma ADD COLUMN IF NOT EXISTS precio_compra numeric;

-- Llenar registros anteriores con el precio actual del producto si están nulos
UPDATE merma m 
SET precio = p.precio, 
    precio_compra = p.precio_compra 
FROM productos p 
WHERE m.producto_id = p.id 
  AND (m.precio IS NULL OR m.precio_compra IS NULL);
