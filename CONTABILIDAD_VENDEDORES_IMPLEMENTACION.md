# Contabilidad de Vendedores - Implementación Completa

## Descripción General
Se ha implementado un sistema completo de contabilidad para vendedores en el panel de administración que permite gestionar gastos mensuales, configurar porcentajes de salario, y calcular resultados financieros detallados por período de tiempo.

## Base de Datos

### Query PostgreSQL para crear las tablas necesarias:

```sql
-- Crear la tabla de gastos de vendedores
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

-- Agregar columna salario a la tabla usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS salario DECIMAL(5,2) DEFAULT 0.00;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_gastos_vendedores_vendedor_mes_anio 
ON gastos_vendedores(vendedor_id, anio, mes);

CREATE INDEX IF NOT EXISTS idx_usuarios_salario ON usuarios(salario);

-- Agregar comentarios
COMMENT ON TABLE gastos_vendedores IS 'Tabla para almacenar gastos mensuales de cada vendedor';
COMMENT ON COLUMN gastos_vendedores.vendedor_id IS 'Referencia al vendedor';
COMMENT ON COLUMN gastos_vendedores.nombre IS 'Nombre del gasto (ej: renta, servicios, etc.)';
COMMENT ON COLUMN gastos_vendedores.valor IS 'Valor mensual del gasto';
COMMENT ON COLUMN gastos_vendedores.mes IS 'Mes (1-12)';
COMMENT ON COLUMN gastos_vendedor.anio IS 'Año (2000-2100)';
COMMENT ON COLUMN usuarios.salario IS 'Porcentaje de salario del vendedor (0-100%)';
```

## Estructura de Archivos Creados

### API Routes
- `src/app/api/gastos-vendedores/route.ts` - CRUD para gastos de vendedores
- `src/app/api/usuarios/salario/route.ts` - Gestión de porcentajes de salario
- `src/app/api/contabilidad-vendedores/route.ts` - Cálculos de contabilidad

### Componentes React
- `src/components/ContabilidadVendedoresPage.tsx` - Página principal de contabilidad
- `src/components/GastosVendedorDialog.tsx` - Dialog para gestionar gastos y salario
- `src/components/ui/separator.tsx` - Componente UI adicional

### Archivos Modificados
- `src/app/pages/AlmacenPage/page.tsx` - Integrado nuevo tab al panel de administración
- `src/db/usuarios.ts` - Actualizado para incluir salario en consulta
- `src/types/index.ts` - Nuevos tipos TypeScript

## Funcionalidades Implementadas

### 1. Gestión de Gastos Mensuales
- **Agregar gastos** por vendedor con nombre y valor mensual
- **Seleccionar mes y año** para gestionar gastos específicos
- **Eliminar gastos** con confirmación
- **Editar gastos** automáticamente al agregar uno existente

### 2. Configuración de Salario
- **Porcentaje personalizable** por vendedor (0-100%)
- **Ejemplo de cálculo** en tiempo real
- **Validación** de rangos de porcentaje

### 3. Cálculos de Contabilidad
- **Selección de período** con date picker
- **Botón "Calcular"** que procesa todos los vendedores
- **Cálculos automáticos**:
  - Venta total del período
  - Ganancia bruta (precio venta - precio compra)
  - Gastos prorrateados según días seleccionados
  - Salario basado en porcentaje de ventas
  - Resultado final (ganancia - gastos - salario)

### 4. Interfaz de Usuario
- **Navegación integrada** en el panel de administración
- **Cards expandibles** por vendedor con detalles
- **Colores diferenciados**: Verde para ganancias, rojo para gastos
- **Desglose detallado** de ventas y gastos
- **Filtros** para buscar vendedores específicos

## Cálculos Detallados

### Gastos Prorrateados
```
Gasto Prorrateado = (Valor Mensual / Días del Mes) × Días del Período Seleccionado
```

### Salario
```
Salario = Venta Total × (Porcentaje Salario / 100)
```

### Resultado Final
```
Resultado = Ganancia Bruta - Gastos - Salario
```

## Uso del Sistema

1. **Acceder**: Panel de Administración → "Contabilidad de Vendedores"
2. **Gestionar Gastos**: Click en botón "Gastos" de cualquier vendedor
3. **Configurar Salario**: En el dialog, pestaña "Salario"
4. **Agregar Gastos**: En el dialog, pestaña "Gastos Mensuales"
5. **Calcular**: Seleccionar período de fechas → Click "Calcular"
6. **Revisar Resultados**: Expandir cards de vendedores para ver detalles

## Estructura de Datos

### GastoVendedor
```typescript
interface GastoVendedor {
  id?: string;
  vendedor_id: string;
  nombre: string;
  valor: number;
  mes: number;
  anio: number;
  created_at?: string;
  updated_at?: string;
}
```

### CalculoContabilidadVendedor
```typescript
interface CalculoContabilidadVendedor {
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
```

## Notas Técnicas

- **Base de datos**: PostgreSQL con queries optimizadas
- **Framework**: Next.js con TypeScript
- **UI**: shadcn/ui components con Tailwind CSS
- **Validaciones**: Client-side y server-side
- **Manejo de errores**: Toast notifications
- **Responsive**: Diseño adaptativo para móviles y desktop

El sistema está completamente integrado al panel de administración existente y listo para uso en producción.