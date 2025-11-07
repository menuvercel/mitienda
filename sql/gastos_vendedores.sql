-- Create the seller expenses table
CREATE TABLE IF NOT EXISTS gastos_vendedores (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio INTEGER NOT NULL CHECK (anio >= 2000 AND anio <= 2100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendedor_id, nombre, mes, anio)
);

-- Add salary column to users table
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS salario DECIMAL(5,2) DEFAULT 0.00;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_gastos_vendedores_vendedor_mes_anio 
ON gastos_vendedores(vendedor_id, anio, mes);

-- Create index for better performance on users salary
CREATE INDEX IF NOT EXISTS idx_usuarios_salario ON usuarios(salario);

-- Add comments
COMMENT ON TABLE gastos_vendedores IS 'Table to store monthly expenses for each seller';
COMMENT ON COLUMN gastos_vendedores.vendedor_id IS 'Reference to the seller (vendedor)';
COMMENT ON COLUMN gastos_vendedores.nombre IS 'Expense name (e.g., rent, utilities, etc.)';
COMMENT ON COLUMN gastos_vendedores.valor IS 'Monthly expense amount';
COMMENT ON COLUMN gastos_vendedores.mes IS 'Month (1-12)';
COMMENT ON COLUMN gastos_vendedores.anio IS 'Year (2000-2100)';
COMMENT ON COLUMN usuarios.salario IS 'Salary percentage for the seller (0-100%)';