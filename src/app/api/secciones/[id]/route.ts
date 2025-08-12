import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const { nombre, foto } = await request.json();

        if (!nombre) {
            return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
        }

        const result = await query(
            'UPDATE secciones SET nombre = $1, foto = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [nombre, foto || '', id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating seccion:', error);
        if ((error as any).code === '23505') {
            return NextResponse.json({ error: 'Ya existe una sección con ese nombre' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        await query('BEGIN');

        try {
            // Primero, quitar la referencia de seccion_id de todos los productos
            await query('UPDATE productos SET seccion_id = NULL WHERE seccion_id = $1', [id]);

            // Luego eliminar la sección
            const result = await query('DELETE FROM secciones WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                await query('ROLLBACK');
                return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });
            }

            await query('COMMIT');
            return NextResponse.json({ message: 'Sección eliminada exitosamente' });
        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error deleting seccion:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
