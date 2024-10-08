import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { createVenta, findVentasByVendedorAndDate } from '@/db/ventas';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Vendedor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { productoId, cantidad, fecha } = body;

  try {
    const venta = await createVenta({
      producto: productoId,
      cantidad,
      precioUnitario: 0, // Asume que el precio se calcula en el backend
      total: 0, // Asume que el total se calcula en el backend
      vendedor: (decoded as { id: string }).id,
      fecha: new Date(fecha)
    });

    return NextResponse.json(venta);
  } catch (error) {
    console.error('Error al crear venta:', error);
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;
  
    if (!decoded) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
  
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Se requieren fechas de inicio y fin' }, { status: 400 });
    }
  
    try {
      const ventas = await findVentasByVendedorAndDate(decoded.id, new Date(startDate), new Date(endDate));
      return NextResponse.json(ventas);
    } catch (error) {
      console.error('Error al obtener ventas:', error);
      return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
    }
  }