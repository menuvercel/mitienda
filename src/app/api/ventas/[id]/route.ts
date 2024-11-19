// app/api/ventas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded || (decoded.rol !== 'Vendedor' && decoded.rol !== 'Almacen')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const ventaId = params.id;

  try {
    // Inicio de la transacción
    await query('BEGIN');

    // Obtener información de la venta
    const ventaResult = await query(
      'SELECT * FROM ventas WHERE id = $1',
      [ventaId]
    );

    if (ventaResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const venta = ventaResult.rows[0];

    // Verificar si el usuario es el vendedor de la venta o un administrador
    if (decoded.rol !== 'Almacen' && venta.vendedor !== decoded.id) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'No autorizado para eliminar esta venta' }, { status: 403 });
    }

    // Restaurar el stock del vendedor
    await query(
      'UPDATE usuario_productos SET cantidad = cantidad + $1 WHERE producto_id = $2 AND usuario_id = $3',
      [venta.cantidad, venta.producto, venta.vendedor]
    );

    // Eliminar la venta
    await query('DELETE FROM ventas WHERE id = $1', [ventaId]);

    // Confirmar la transacción
    await query('COMMIT');

    return NextResponse.json({ message: 'Venta eliminada con éxito' });
  } catch (error) {
    // Revertir la transacción en caso de error
    await query('ROLLBACK');
    console.error('Error al eliminar venta:', error);
    return NextResponse.json({ error: 'Error al eliminar venta', details: (error as Error).message }, { status: 500 });
  }
}