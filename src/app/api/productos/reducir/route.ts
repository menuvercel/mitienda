import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, DecodedToken } from '@/lib/auth';

export async function PUT(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        const decoded = verifyToken(token) as DecodedToken | null;
        if (!decoded || decoded.rol !== 'Almacen') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { productoId, vendedorId, cantidad, parametros } = body;

        if (!productoId || !vendedorId || !cantidad) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        await query('BEGIN');

        try {
            // Verificar producto principal
            const usuarioProductoResult = await query(
                'SELECT cantidad FROM usuario_productos WHERE usuario_id = $1 AND producto_id = $2',
                [vendedorId, productoId]
            );

            if (usuarioProductoResult.rows.length === 0) {
                throw new Error('El vendedor no tiene este producto asignado');
            }

            const cantidadActual = usuarioProductoResult.rows[0].cantidad;
            if (cantidad > cantidadActual) {
                throw new Error('La cantidad a reducir es mayor que la cantidad disponible');
            }

            // Verificar y actualizar parámetros si existen
            if (parametros && parametros.length > 0) {
                for (const param of parametros) {
                    const paramResult = await query(
                        'SELECT cantidad FROM usuario_producto_parametros WHERE usuario_id = $1 AND producto_id = $2 AND nombre = $3',
                        [vendedorId, productoId, param.nombre]
                    );

                    if (paramResult.rows.length === 0 || paramResult.rows[0].cantidad < param.cantidad) {
                        throw new Error(`Cantidad insuficiente para el parámetro ${param.nombre}`);
                    }

                    // Actualizar cantidad del parámetro
                    await query(
                        'UPDATE usuario_producto_parametros SET cantidad = cantidad - $1 WHERE usuario_id = $2 AND producto_id = $3 AND nombre = $4',
                        [param.cantidad, vendedorId, productoId, param.nombre]
                    );

                    // Actualizar cantidad en almacén
                    await query(
                        'UPDATE producto_parametros SET cantidad = cantidad + $1 WHERE producto_id = $2 AND nombre = $3',
                        [param.cantidad, productoId, param.nombre]
                    );
                }
            }

            // Actualizar cantidad principal
            await query(
                'UPDATE usuario_productos SET cantidad = cantidad - $1 WHERE usuario_id = $2 AND producto_id = $3',
                  [cantidad, vendedorId, productoId]
                );
    
                // Actualizar cantidad en almacén
                await query(
                    'UPDATE productos SET cantidad = cantidad + $1 WHERE id = $2',
                    [cantidad, productoId]
                );
    
                await query('COMMIT');
    
                // Obtener datos actualizados
                const updatedData = await query(`
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
                    WHERE up.usuario_id = $1 AND up.producto_id = $2
                    GROUP BY up.producto_id, p.nombre, p.precio, up.cantidad, p.foto, p.tiene_parametros
                `, [vendedorId, productoId]);
    
                return NextResponse.json(updatedData.rows[0]);
            } catch (error) {
                await query('ROLLBACK');
                console.error('Error en la transacción:', error);
                return NextResponse.json({ 
                    error: 'Error al procesar la reducción', 
                    details: (error as Error).message 
                }, { status: 400 });
            }
        } catch (error) {
            console.error('Error en la ruta de reducción:', error);
            return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
        }
    }
    