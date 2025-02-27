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
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  precio_compra?: number;
  cantidad: number;
  foto: string;
  tiene_parametros: boolean;  // Propiedad del backend
  tieneParametros?: boolean;  // Propiedad del frontend
  parametros?: Parametro[] 
}

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

// Agregar nueva interface para los parámetros de transacción
export interface TransaccionParametro {
  id: string;
  transaccion_id: string;
  nombre: string;
  cantidad: number;
}

// Actualizar la interface Transaccion para incluir los parámetros
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
  parametros?: TransaccionParametro[]; // Agregar esta línea
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