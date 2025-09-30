-- Crear la tabla carrusel_imagenes
CREATE TABLE IF NOT EXISTS carrusel_imagenes (
    id SERIAL PRIMARY KEY,
    foto VARCHAR(255),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar algunas imágenes de ejemplo (opcional)
-- INSERT INTO carrusel_imagenes (foto, orden, activo) VALUES
--     ('https://ejemplo.com/imagen1.jpg', 0, true),
--     ('https://ejemplo.com/imagen2.jpg', 1, true);