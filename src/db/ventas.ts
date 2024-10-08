import dbConnect from '../lib/db';
import Venta, { IVenta } from '@/models/Venta';

export async function createVenta(venta: Partial<IVenta>): Promise<IVenta> {
    await dbConnect();
    return Venta.create(venta);
  }

  export async function findVentasByVendedorAndDate(
    vendedorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IVenta[]> {
    await dbConnect();
    return Venta.find({
      vendedor: vendedorId,
      fecha: { $gte: startDate, $lte: endDate }
    }).populate('producto', 'nombre foto');
  }

  export async function getIngresosDia(): Promise<any[]> {
    await dbConnect();
    const fecha = new Date();
    fecha.setHours(0, 0, 0, 0);
    return Venta.aggregate([
      { $match: { fecha: { $gte: fecha } } },
      { $group: { _id: '$vendedor', total: { $sum: '$total' } } },
      { $lookup: { from: 'usuarios', localField: '_id', foreignField: '_id', as: 'vendedor' } },
      { $unwind: '$vendedor' },
      { $project: { vendedor_id: '$_id', vendedor_nombre: '$vendedor.nombre', total: 1, _id: 0 } }
    ]);
  }

  export async function getIngresosMes(): Promise<any[]> {
    await dbConnect();
    const fecha = new Date();
    fecha.setDate(1);
    fecha.setHours(0, 0, 0, 0);
    return Venta.aggregate([
      { $match: { fecha: { $gte: fecha } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } }, total: { $sum: '$total' } } },
      { $sort: { _id: 1 } },
      { $project: { fecha: '$_id', total: 1, _id: 0 } }
    ]);
  }