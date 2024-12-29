import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { query } from '@/lib/db';

const obtenerProductoConParametros = async (productoId: string) => {
    const result = await query(`
        SELECT 
            p.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'nombre', pp.nombre,
                        'cantidad', pp.cantidad
                    )
                ) FILTER (WHERE pp.id IS NOT NULL),
                '[]'::json
            ) as parametros
        FROM productos p
        LEFT JOIN producto_parametros pp ON p.id = pp.producto_id
        WHERE p.id = $1
        GROUP BY p.id
    `, [productoId]);

    return result.rows[0];
};

export async function POST(request: NextRequest) {
    try {
  
        const formData = await request.formData();
        const nombre = formData.get('nombre') as string;
        const precio = formData.get('precio') as string;
        const cantidad = formData.get('cantidad') as string;
        const foto = formData.get('foto') as File | null;
        const tieneParametros = formData.get('tieneParametros') === 'true';
        const parametrosRaw = formData.get('parametros') as string;
        const parametros = parametrosRaw ? JSON.parse(parametrosRaw) : [];

        console.log('Received form data:', { nombre, precio, cantidad, foto, tieneParametros, parametros });
  
        let fotoUrl = '';
  
        if (foto && foto instanceof File) {
            try {
                console.log('Uploading image:', foto.name);
                const blob = await put(foto.name, foto, {
                    access: 'public',
                });
                fotoUrl = blob.url;
                console.log('Image uploaded successfully:', fotoUrl);
            } catch (error) {
                console.error('Error uploading image:', error);
                return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
            }
        }

        await query('BEGIN');

        try {
            const result = await query(
                'INSERT INTO productos (nombre, precio, cantidad, foto, tiene_parametros) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [nombre, Number(precio), Number(cantidad), fotoUrl, tieneParametros]
            );

            const productoId = result.rows[0].id;

            if (tieneParametros && parametros.length > 0) {
                for (const param of parametros) {
                    await query(
                        'INSERT INTO producto_parametros (producto_id, nombre, cantidad) VALUES ($1, $2, $3)',
                        [productoId, param.nombre, param.cantidad]
                    );
                }
            }

            await query('COMMIT');
            
            const productoCompleto = await obtenerProductoConParametros(productoId);
            return NextResponse.json(productoCompleto);
        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
  
        const result = await query(`
            SELECT 
                p.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'nombre', pp.nombre,
                            'cantidad', pp.cantidad
                        )
                    ) FILTER (WHERE pp.id IS NOT NULL),
                    '[]'::json
                ) as parametros
            FROM productos p
            LEFT JOIN producto_parametros pp ON p.id = pp.producto_id
            GROUP BY p.id
        `);
  
  
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}