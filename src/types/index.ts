// src/types/index.ts

export interface VentaSemana {
  fechaInicio: string
  fechaFin: string
  ventas: Venta[]
  total: number
  ganancia: number
}

interface VentaDia {
  fecha: string
  ventas: Venta[]
  total: number
}

export interface Parametro {
  nombre: string;
  cantidad: number;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  foto?: string;
  tiene_parametros: boolean;  // Propiedad del backend
  tieneParametros?: boolean;  // Propiedad del frontend
  parametros?: Parametro[] 
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

export interface Transaccion {
  id: string;
  producto: string;
  cantidad: number;
  tipo: 'Entrega' | 'Baja';
  desde: string;
  hacia: string;
  fecha: string;
  precio?: number;
  parametros?: Array<{
    nombre: string;
    cantidad: number;
  }>;
}

export interface Entrega {
  id: string;
  fecha: string;
  producto: Producto;
  cantidad: number;
  vendedor: Vendedor;
}