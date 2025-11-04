import mongoose from 'mongoose';

export interface IProducto {
  _id?: string;
  nombre: string;
  precio: number;
  cantidad: number;
  foto?: string;
  valor_compra_usd?: number; // Nuevo campo para el valor de compra del USD
  precio_compra_usd?: number; // Nuevo campo para el precio de compra en USD
  precio_venta_usd?: number; // Nuevo campo para el precio de venta en USD
}

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  cantidad: { type: Number, required: true },
  foto: { type: String },
  valor_compra_usd: { type: Number }, // Nuevo campo para el valor de compra del USD
  precio_compra_usd: { type: Number }, // Nuevo campo para el precio de compra en USD
  precio_venta_usd: { type: Number } // Nuevo campo para el precio de venta en USD
}, { timestamps: true });

const Producto = mongoose.models.Producto || mongoose.model('Producto', productoSchema);

export default Producto;