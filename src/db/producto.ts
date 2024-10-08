import dbConnect from '@/lib/db';
import Producto, { IProducto } from '@/models/Producto';

export async function createProducto(producto: Partial<IProducto>): Promise<IProducto> {
    await dbConnect();
    return Producto.create(producto);
  }

  export async function findProductoById(id: string): Promise<IProducto | null> {
    await dbConnect();
    return Producto.findById(id);
  }

export async function updateProducto(id: string, producto: Partial<IProducto>): Promise<IProducto | null> {
   await dbConnect();
  return Producto.findByIdAndUpdate(id, producto, { new: true });
}
  
 export async function deleteProducto(id: string): Promise<boolean> {
 await dbConnect();
 const result = await Producto.findByIdAndDelete(id);
 return !!result;
}

export async function getAllProductos() {
  await dbConnect();
  return Producto.find();
}