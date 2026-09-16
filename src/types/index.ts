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
  codigo_barras?: string;
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
  codigo_barras?: string; // Nuevo campo para código de barras
  fecha_vencimiento?: string | null;
  tiene_vencimiento?: boolean;
  stock_minimo?: number;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  precio_compra?: number;
  cantidad: number;
  foto: string;
  tiene_parametros?: boolean;
  tieneParametros?: boolean;
  parametros?: Parametro[];
  descripcion?: string;
  seccion_id?: string;
  subseccion_id?: string;
  valor_compra_usd?: number | null;
  precio_compra_usd?: number | null;
  precio_venta_usd?: number | null;
  codigo_barras?: string;
  fecha_vencimiento?: string | null;
  tiene_vencimiento?: boolean;
  stock_minimo?: number;
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
  salario?: number;
  tipo_salario?: 'porcentaje' | 'fijo_mensual';
  activo?: boolean;
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
  parametros?: Parametro[];
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
  id?: string | number;
  vendedor_id?: string;
  nombre: string;
  valor?: number;
  cantidad?: number;
  mes?: number;
  anio?: number;
  fecha?: string;
  tipo_gasto?: 'fijo' | 'variable';
  created_at?: string;
  updated_at?: string;
}

export interface SalarioMensualVendedor {
  id?: number;
  vendedor_id: string;
  mes: number;
  anio: number;
  salario: number;
}

export interface VendedorConSalario extends Vendedor {
  salario?: number;
  tipo_salario?: 'porcentaje' | 'fijo_mensual';
}

export interface CalculoContabilidadVendedor {
  vendedorId: string;
  vendedorNombre: string;
  tipoSalario?: 'porcentaje' | 'fijo_mensual';
  salarioPorcentaje?: number;
  salarioFijoMes?: number;
  ventaTotal: number;
  ventaEfectivo: number;
  ventaTransferencia: number;
  gananciaBruta: number;
  gananciaEfectivo: number;
  gananciaTransferencia: number;
  gastos: number;
  gastosFijos: number;
  gastosVariables: number;
  gastosMerma: number;
  salario: number;
  resultado: number;
  utilidadFinal: number;
  margenBrutoPct: number;
  margenNetoPct: number;
  detalles: {
    ventas: Array<{
      producto: string;
      cantidad: number;
      precioVenta: number;
      precioCompra: number;
      gananciaProducto: number;
      metodo_pago?: string;
      monto_efectivo?: number;
      monto_transferencia?: number;
    }>;
    gastosDesglosados: Array<{
      nombre: string;
      valorMensual: number;
      diasSeleccionados: number;
      valorProrrateado: number;
      tipo_gasto?: 'fijo' | 'variable';
    }>;
    mermaDesglosada?: Array<{
      producto: string;
      cantidad: number;
      precio: number;
      total: number;
      fecha: string;
    }>;
  };
  error?: string;
}

export interface ContabilidadResponse {
  vendedores: CalculoContabilidadVendedor[];
  totalMermas: number;
}

export interface NotificacionVendedor {
  id: string;
  vendedor_id: string;
  vendedor_nombre?: string;
  tipo: 'bajo_stock' | 'poca_rotacion' | 'manual';
  mensaje: string;
  fecha_envio: string;
  leido?: boolean;
  productos_afectados?: string[];
}

export interface AlertaVendedorStock {
  vendedor_id: string;
  vendedor_nombre: string;
  vendedor_telefono?: string;
  total_agotados: number;
  total_bajo_stock: number;
  productos_criticos: Array<{
    id: string;
    nombre: string;
    cantidad: number;
    stock_minimo: number;
    estado: 'agotado' | 'bajo_stock';
  }>;
}

export interface RendimientoProducto {
  id: string;
  nombre: string;
  foto?: string | null;
  total_vendido: number;
  monto_total: number;
  vendedor_id?: string;
  vendedor_nombre?: string;
  es_estrella?: boolean;
  es_estancado?: boolean;
  dias_sin_ventas?: number;
}

