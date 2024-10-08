import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { createTransaccion, findTransaccionesByVendedor } from '@/db/transacciones';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { productoId, vendedorId, cantidad } = body;

  try {
    const transaccion = await createTransaccion({
      producto: productoId,
      cantidad,
      precio: 0, // Asume que el precio se calcula en el backend
      desde: (decoded as { id: string }).id, // Asume que el almacén es el que crea la transacción
      hacia: vendedorId,
      fecha: new Date()
    });

    return NextResponse.json(transaccion);
  } catch (error) {
    console.error('Error al crear transacción:', error);
    return NextResponse.json({ error: 'Error al crear transacción' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token);
  
    if (!decoded) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

  const { searchParams } = new URL(request.url);
  const vendedorId = searchParams.get('vendedorId');

  if (!vendedorId) {
    return NextResponse.json({ error: 'Se requiere el ID del vendedor' }, { status: 400 });
  }

  try {
    const transacciones = await findTransaccionesByVendedor(vendedorId);
    return NextResponse.json(transacciones);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
  }
}