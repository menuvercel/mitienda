import mongoose from 'mongoose';

export interface IVenta {
  _id?: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  vendedor: string;
  fecha: Date;
}

const ventaSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  cantidad: { type: Number, required: true },
  precioUnitario: { type: Number, required: true },
  total: { type: Number, required: true },
  vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now }
}, { timestamps: true });

const Venta = mongoose.models.Venta || mongoose.model('Venta', ventaSchema);

export default Venta;