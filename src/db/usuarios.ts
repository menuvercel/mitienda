import dbConnect from '../lib/db';
import Usuario, { IUsuario } from '../models/Usuario';

export async function createUsuario(usuario: Partial<IUsuario>): Promise<IUsuario> {
  await dbConnect();
  return Usuario.create(usuario);
}

export async function findUsuarioById(id: string): Promise<IUsuario | null> {
  await dbConnect();
  return Usuario.findById(id);
}

export async function findUsuarioByNombre(nombre: string) {
  await dbConnect();
  return Usuario.findOne({ nombre });
}

export async function getVendedores() {
  await dbConnect();
  return Usuario.find({ rol: 'Vendedor' }, 'id nombre telefono rol');
}

export async function updateUsuarioProducto(
    usuarioId: string,
    productoId: string,
    cantidad: number,
    precio: number
  ): Promise<IUsuario | null> {
    await dbConnect();
    return Usuario.findOneAndUpdate(
      { _id: usuarioId, 'productos.producto': productoId },
      { 
        $inc: { 'productos.$.cantidad': cantidad },
        $set: { 'productos.$.precio': precio }
      },
      { new: true, upsert: true }
    );
  }
  
  export async function getUsuarioProductos(usuarioId: string): Promise<Array<{ producto: string; cantidad: number; precio: number }> | undefined> {
    await dbConnect();
    const usuario = await Usuario.findById(usuarioId).populate('productos.producto');
    return usuario?.productos;
  }