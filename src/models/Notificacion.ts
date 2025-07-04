import mongoose, { Document } from 'mongoose';

export interface INotificacion extends Document {
  _id: mongoose.Types.ObjectId;
  texto: string;
  usuarios: mongoose.Types.ObjectId[];
  leido: Map<string, boolean>;
  fecha: Date;
}

const notificacionSchema = new mongoose.Schema({
  texto: { type: String, required: true },
  usuarios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
  leido: { type: Map, of: Boolean, default: new Map() },
  fecha: { type: Date, default: Date.now }
}, { timestamps: true });

const Notificacion = mongoose.models.Notificacion || mongoose.model<INotificacion>('Notificacion', notificacionSchema);

export default Notificacion;