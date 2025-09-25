import { NextRequest, NextResponse } from 'next/server';
import { createPromocion, getAllPromociones } from '@/db/promociones';

export async function GET(req: NextRequest) {
  try {
    const promociones = await getAllPromociones();
    return NextResponse.json(promociones);
  } catch (error) {
    console.error('Error al obtener promociones:', error);
    return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validar datos
    if (!data.nombre || !data.valor_descuento || !data.fecha_inicio || !data.fecha_fin) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Crear la promoción
    const nuevaPromocion = await createPromocion({
      nombre: data.nombre,
      valor_descuento: parseFloat(data.valor_descuento),
      fecha_inicio: new Date(data.fecha_inicio),
      fecha_fin: new Date(data.fecha_fin),
      activa: data.activa !== undefined ? data.activa : true
    });

    return NextResponse.json(nuevaPromocion, { status: 201 });
  } catch (error) {
    console.error('Error al crear promoción:', error);
    return NextResponse.json({ error: 'Error al crear promoción' }, { status: 500 });
  }
}