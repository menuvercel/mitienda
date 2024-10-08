import mongoose from 'mongoose';

export interface ITransaccion {
  _id?: string;
  producto: string;
  cantidad: number;
  precio: number;
  desde: string;
  hacia: string;
  fecha: Date;
}

const transaccionSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  cantidad: { type: Number, required: true },
  precio: { type: Number, required: true },
  desde: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  hacia: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now }
}, { timestamps: true });

const Transaccion = mongoose.models.Transaccion || mongoose.model('Transaccion', transaccionSchema);

export default Transaccion;