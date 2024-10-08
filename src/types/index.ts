// src/types/index.ts

export interface Producto {
    id: string;
    nombre: string;
    precio: number;
    cantidad: number;
    foto: string;
  }

  export interface Venta {
    _id: string;
    producto: {
      _id: string;
      nombre: string;
      foto: string;
    };
    cantidad: number;
    precioUnitario: number;
    total: number;
    vendedor: string;
    fecha: string;
  }

  export interface Vendedor {
    id: string;
    nombre: string;
    productos: Producto[];
    rol: string;
    telefono: string;
  }