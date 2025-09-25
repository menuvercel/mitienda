import { NextRequest, NextResponse } from 'next/server';
import { deletePromocion, getPromocionById, updatePromocion, togglePromocionStatus } from '@/db/promociones';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const promocion = await getPromocionById(params.id);
    
    if (!promocion) {
      return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 });
    }
    
    return NextResponse.json(promocion);
  } catch (error) {
    console.error('Error al obtener promoción:', error);
    return NextResponse.json({ error: 'Error al obtener promoción' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    
    // Preparar datos para actualización
    const promocionData: any = {};
    
    if (data.nombre !== undefined) promocionData.nombre = data.nombre;
    if (data.valor_descuento !== undefined) promocionData.valor_descuento = parseFloat(data.valor_descuento);
    if (data.fecha_inicio !== undefined) promocionData.fecha_inicio = new Date(data.fecha_inicio);
    if (data.fecha_fin !== undefined) promocionData.fecha_fin = new Date(data.fecha_fin);
    if (data.activa !== undefined) promocionData.activa = data.activa;

    const promocionActualizada = await updatePromocion(params.id, promocionData);
    
    if (!promocionActualizada) {
      return NextResponse.json({ error: 'Promoción no encontrada o no se realizaron cambios' }, { status: 404 });
    }
    
    return NextResponse.json(promocionActualizada);
  } catch (error) {
    console.error('Error al actualizar promoción:', error);
    return NextResponse.json({ error: 'Error al actualizar promoción' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eliminado = await deletePromocion(params.id);
    
    if (!eliminado) {
      return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar promoción:', error);
    return NextResponse.json({ error: 'Error al eliminar promoción' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    
    if (data.activa === undefined) {
      return NextResponse.json({ error: 'Se requiere el campo activa' }, { status: 400 });
    }

    const promocionActualizada = await togglePromocionStatus(params.id, data.activa);
    
    if (!promocionActualizada) {
      return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 });
    }
    
    return NextResponse.json(promocionActualizada);
  } catch (error) {
    console.error('Error al cambiar estado de promoción:', error);
    return NextResponse.json({ error: 'Error al cambiar estado de promoción' }, { status: 500 });
  }
}