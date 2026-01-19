// src/types/index.ts

export interface VentaSemana {
  fechaInicio: string
  fechaFin: string
  ventas: Venta[]
  total: number
  ganancia: number
}

export interface Parametro {
  nombre: string;
  cantidad: number;
  foto?: string;
}

export interface ProductoNuevo {
  nombre: string;
  precio: number;
  precioCompra: number;
  cantidad: number;
  foto: string;
  tieneParametros: boolean;
  parametros: Parametro[]; // Ahora es un array de Parametro, no never[]
  descripcion: string;
  valorCompraUSD: number | null; // Añadir este campo
  precioCompraUSD: number | null; // Nuevo campo para precio de compra en USD
  precioVentaUSD: number | null; // Nuevo campo para precio de venta en USD
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  precio_compra?: number;
  cantidad: number;
  foto: string;
  tiene_parametros: boolean;
  tieneParametros?: boolean;
  parametros?: Parametro[];
  descripcion?: string;
  seccion_id?: string;
  subseccion_id?: string;
  valor_compra_usd?: number | null; // ✅ Permitir null
  precio_compra_usd?: number | null; // Nuevo campo para precio de compra en USD
  precio_venta_usd?: number | null; // Nuevo campo para precio de venta en USD
}

// El resto del archivo se mantiene igual...


export interface VentaParametro {
  nombre: string;
  cantidad: number;
}

export interface Venta {
  id: string;
  producto: string;
  producto_nombre: string;
  producto_foto: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  vendedor: string;
  fecha: string;
  parametros?: VentaParametro[];
}

export interface Vendedor {
  id: string;
  nombre: string;
  productos: Producto[];
  rol: string;
  telefono?: string;
  password: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  rol: 'Almacen' | 'Vendedor';
  telefono?: string;
}

export interface TransaccionParametro {
  id: string;
  transaccion_id: string;
  nombre: string;
  cantidad: number;
}

export interface Transaccion {
  id: string;
  tipo: 'Baja' | 'Entrega';
  producto: string;
  cantidad: number;
  desde: string;
  hacia: string;
  fecha: string;
  precio: number;
  parametro_nombre?: string;
  parametros?: TransaccionParametro[];
}

export interface Entrega {
  id: string;
  fecha: string;
  producto: Producto;
  cantidad: number;
  vendedor: Vendedor;
}

export interface Merma {
  id: string;
  producto: Producto;
  cantidad: number;
  fecha: string;
  usuario_id: number;
  usuario_nombre: string;
}

export interface TransferProductParams {
  productId: string;
  fromVendorId: string;
  toVendorId: string;
  cantidad: number;
  parametros?: Array<{ nombre: string; cantidad: number }>;
}

export interface Notificacion {
  id: string;
  notificacion_grupo_id?: number;  // ✅ NUEVO CAMPO
  texto: string;
  fecha: string;
  leida?: boolean;
  usuario_id?: string;
  usuarios?: Array<{
    id: string;
    nombre: string;
    leida: boolean;
    fecha_lectura?: string;
  }>;
}

export interface Seccion {
  id: string;
  nombre: string;
  foto?: string;
  created_at?: string;
  updated_at?: string;
  productos_count?: number;
  subsecciones_count?: number;
}

// Agregar al final del archivo
export interface Promocion {
  id: string;
  nombre: string;
  valor_descuento: number;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
}


export interface Subseccion {
  id: string;
  nombre: string;
  foto?: string;
  seccion_id: string;
  created_at?: string;
  updated_at?: string;
  productos_count?: number;
}

// Types for seller accounting
export interface GastoVendedor {
  id?: string;
  vendedor_id: string;
  nombre: string;
  valor: number;
  mes: number;
  anio: number;
  created_at?: string;
  updated_at?: string;
}

export interface CalculoContabilidadVendedor {
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
  error?: string;
}

export interface VendedorConSalario extends Vendedor {
  salario: number;
}

export interface ContabilidadResponse {
  vendedores: CalculoContabilidadVendedor[];
  totalMermas: number;
}
