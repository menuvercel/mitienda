import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query(`
            SELECT 
                p.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'nombre', pp.nombre,
                            'cantidad', pp.cantidad,
                            'foto', pp.foto
                        )
                    ) FILTER (WHERE pp.id IS NOT NULL),
                    '[]'::json
                ) as parametros
            FROM productos p
            LEFT JOIN producto_parametros pp ON p.id = pp.producto_id
            WHERE p.destacado = TRUE
            GROUP BY p.id
            ORDER BY p.nombre ASC
        `);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching productos destacados:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { productIds } = await request.json();

        await query('BEGIN');

        try {
            // Primero, quitar destacado de todos los productos
            await query('UPDATE productos SET destacado = FALSE');

            // Luego, marcar como destacados los productos seleccionados
            if (productIds && productIds.length > 0) {
                const placeholders = productIds.map((_: any, index: number) => `$${index + 1}`).join(',');
                await query(
                    `UPDATE productos SET destacado = TRUE WHERE id IN (${placeholders})`,
                    productIds
                );
            }

            await query('COMMIT');
            return NextResponse.json({ message: 'Productos destacados actualizados exitosamente' });
        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error updating productos destacados:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
