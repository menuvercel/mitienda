import dbConnect from '../lib/db';
import Transaccion, { ITransaccion } from '../models/Transaccion';

export async function createTransaccion(transaccion: Partial<ITransaccion>): Promise<ITransaccion> {
  await dbConnect();
  return Transaccion.create(transaccion);
}

export async function findTransaccionesByVendedor(vendedorId: string): Promise<ITransaccion[]> {
  await dbConnect();
  return Transaccion.find({ hacia: vendedorId })
    .populate('producto', 'nombre')
    .sort({ fecha: -1 });
}