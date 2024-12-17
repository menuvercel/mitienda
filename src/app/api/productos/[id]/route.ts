import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { put } from '@vercel/blob';

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = request.cookies.get('token')?.value;
        const decoded = verifyToken(token) as DecodedToken | null;

        if (!decoded || decoded.rol !== 'Almacen') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = params;
        const formData = await request.formData();

            // Log todos los campos del FormData para debug
            console.log('FormData fields:');
            Array.from(formData.entries()).forEach(([key, value]) => {
                console.log(`${key}: ${value}`);
            });


        const nombre = formData.get('nombre') as string;
        const precio = formData.get('precio') as string;
        const cantidad = formData.get('cantidad') as string;
        const foto = formData.get('foto') as File | null;
        
        // Cambiar aquí para aceptar ambas versiones del campo
        const tieneParametros = 
            formData.get('tiene_parametros') === 'true' || 
            formData.get('tieneParametros') === 'true';
            
        const parametrosRaw = formData.get('parametros') as string;
        const parametros = parametrosRaw ? JSON.parse(parametrosRaw) : [];

        console.log('Parsed data:', {
            nombre,
            precio,
            cantidad,
            tieneParametros,
            parametros,
            foto: foto?.name
        });

        const currentProduct = await query('SELECT * FROM productos WHERE id = $1', [id]);
        
        if (currentProduct.rows.length === 0) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        let fotoUrl = currentProduct.rows[0].foto;

        if (foto && foto instanceof File) {
            try {
                console.log('Uploading new image:', foto.name);
                const blob = await put(foto.name, foto, {
                    access: 'public',
                });
                fotoUrl = blob.url;
                console.log('New image uploaded successfully:', fotoUrl);
            } catch (error) {
                console.error('Error uploading image:', error);
                return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
            }
        }

        await query('BEGIN');

        try {
            // Log de la consulta de actualización
            console.log('Updating product with:', {
                nombre,
                precio: Number(precio),
                cantidad: Number(cantidad),
                fotoUrl,
                tieneParametros,
                id
            });

            const result = await query(
                'UPDATE productos SET nombre = $1, precio = $2, cantidad = $3, foto = $4, tiene_parametros = $5 WHERE id = $6 RETURNING *',
                [nombre, Number(precio), Number(cantidad), fotoUrl, tieneParametros, id]
            );

            console.log('Update result:', result.rows[0]);

            await query('DELETE FROM producto_parametros WHERE producto_id = $1', [id]);

            if (tieneParametros && parametros.length > 0) {
                for (const param of parametros) {
                    await query(
                        'INSERT INTO producto_parametros (producto_id, nombre, cantidad) VALUES ($1, $2, $3)',
                        [id, param.nombre, param.cantidad]
                    );
                }
            }

            await query('COMMIT');

            const productoActualizado = await obtenerProductoConParametros(id);
            console.log('Producto actualizado:', productoActualizado);
            return NextResponse.json(productoActualizado);
        } catch (error) {
            await query('ROLLBACK');
            console.error('Error en la transacción:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json({ 
            error: 'Error interno del servidor',
            details: (error as Error).message
        }, { status: 500 });
    }
}


export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    console.log('DELETE function called');
    try {
        const token = request.cookies.get('token')?.value;
        const decoded = verifyToken(token) as DecodedToken | null;

        if (!decoded || decoded.rol !== 'Almacen') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = params;
        
        await query('BEGIN');

        try {
            // 1. Verificar si el producto existe
            const producto = await query(
                'SELECT * FROM productos WHERE id = $1',
                [id]
            );

            if (producto.rows.length === 0) {
                await query('ROLLBACK');
                return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
            }

            // 2. Eliminar los parámetros asociados si existen
            if (producto.rows[0].tiene_parametros) {
                await query('DELETE FROM producto_parametros WHERE producto_id = $1', [id]);
            }

            // 3. Eliminar el producto
            await query('DELETE FROM productos WHERE id = $1', [id]);

            await query('COMMIT');

            return NextResponse.json({ 
                message: 'Producto y sus parámetros eliminados exitosamente',
                deletedProduct: producto.rows[0]
            });
        } catch (error) {
            await query('ROLLBACK');
            console.error('Error durante la eliminación:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error in DELETE function:', error);
        return NextResponse.json({ 
            error: 'Error interno del servidor', 
            details: (error as Error).message
        }, { status: 500 });
    }
}




export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = request.cookies.get('token')?.value;
        const decoded = verifyToken(token) as DecodedToken | null;

        if (!decoded) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = params;

        const result = await query(`
            SELECT 
                up.producto_id as id, 
                p.nombre, 
                p.precio, 
                up.cantidad, 
                p.foto,
                p.tiene_parametros,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'nombre', upp.nombre,
                            'cantidad', upp.cantidad
                        )
                    ) FILTER (WHERE upp.id IS NOT NULL),
                    '[]'::json
                ) as parametros
            FROM usuario_productos up
            JOIN productos p ON up.producto_id = p.id
            LEFT JOIN usuario_producto_parametros upp ON up.producto_id = upp.producto_id AND up.usuario_id = upp.usuario_id
            WHERE up.usuario_id = $1
            GROUP BY up.producto_id, p.nombre, p.precio, up.cantidad, p.foto, p.tiene_parametros
        `, [id]);

        console.log('Productos del vendedor con parámetros:', result.rows);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching vendor products:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}