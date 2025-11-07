import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

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
            WHERE p.seccion_id = $1
            GROUP BY p.id
            ORDER BY p.nombre ASC
        `, [id]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching productos by seccion:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const { productIds } = await request.json();

        await query('BEGIN');

        try {
            // Primero, quitar todos los productos de esta sección
            await query('UPDATE productos SET seccion_id = NULL WHERE seccion_id = $1', [id]);

            // Luego, agregar los productos seleccionados a esta sección
            if (productIds && productIds.length > 0) {
                const placeholders = productIds.map((_: any, index: number) => `$${index + 2}`).join(',');
                await query(
                    `UPDATE productos SET seccion_id = $1 WHERE id IN (${placeholders})`,
                    [id, ...productIds]
                );
            }

            await query('COMMIT');
            return NextResponse.json({ message: 'Productos actualizados exitosamente' });
        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error updating productos in seccion:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
