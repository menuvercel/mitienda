import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query(`
            SELECT 
                s.*,
                COUNT(p.id) as productos_count
            FROM secciones s
            LEFT JOIN productos p ON s.id = p.seccion_id
            GROUP BY s.id
            ORDER BY s.nombre ASC
        `);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching secciones:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { nombre, foto } = await request.json();

        if (!nombre) {
            return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
        }

        const result = await query(
            'INSERT INTO secciones (nombre, foto) VALUES ($1, $2) RETURNING *',
            [nombre, foto || '']
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating seccion:', error);
        if ((error as any).code === '23505') { // Unique constraint violation
            return NextResponse.json({ error: 'Ya existe una sección con ese nombre' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
