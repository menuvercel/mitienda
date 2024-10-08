// src/types/index.ts

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  foto?: string;
}

export interface Venta {
  _id: string;
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
  precio: number;
  desde: string;
  hacia: string;
  fecha: string;
}

export interface Entrega {
  id: string;
  fecha: string;
  producto: Producto;
  cantidad: number;
  vendedor: Vendedor;
}