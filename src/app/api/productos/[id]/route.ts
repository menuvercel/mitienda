import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { put } from '@vercel/blob';

// Definir interfaces para mejorar el tipado
interface Parametro {
    nombre: string;
    cantidad: number;
}

interface ParametroAntiguo {
    nombre: string;
}

interface UsuarioProducto {
    usuario_id: string;
}

interface ParametroVendedor {
    nombre: string;
    cantidad: number;
}

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
        const { id } = params;
        const formData = await request.formData();

        const nombre = formData.get('nombre') as string;
        const precio = formData.get('precio') as string;
        const cantidad = formData.get('cantidad') as string;
        const fotoUrl = formData.get('fotoUrl') as string | null;
        const tieneParametros = formData.get('tiene_parametros') === 'true';
        const parametrosRaw = formData.get('parametros') as string;
        const parametros: Parametro[] = parametrosRaw ? JSON.parse(parametrosRaw) : [];

        // Extraer el precio_compra del FormData
        const precioCompra = formData.get('precio_compra') as string;

        // Log para depuración
        console.log('Datos recibidos en el endpoint PUT:', {
            id,
            nombre,
            precio,
            precio_compra: precioCompra,
            cantidad,
            tieneParametros,
            parametros: parametros.length
        });

        const currentProduct = await query('SELECT * FROM productos WHERE id = $1', [id]);

        if (currentProduct.rows.length === 0) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        // Si no se proporciona una nueva URL de imagen, usa la existente
        const nuevaFotoUrl = fotoUrl || currentProduct.rows[0].foto;

        await query('BEGIN');

        try {
            // 1. Actualizar el producto principal - INCLUIR precio_compra
            const result = await query(
                'UPDATE productos SET nombre = $1, precio = $2, cantidad = $3, foto = $4, tiene_parametros = $5, precio_compra = $6 WHERE id = $7 RETURNING *',
                [
                    nombre,
                    Number(precio),
                    Number(cantidad),
                    nuevaFotoUrl,
                    tieneParametros,
                    precioCompra ? Number(precioCompra) : currentProduct.rows[0].precio_compra || 0,
                    id
                ]
            );

            // 2. Obtener los parámetros antiguos del producto principal para mapeo
            const parametrosAntiguosResult = await query(
                'SELECT nombre FROM producto_parametros WHERE producto_id = $1',
                [id]
            );
            
            // Convertir explícitamente los resultados al tipo deseado
            const parametrosAntiguos: ParametroAntiguo[] = parametrosAntiguosResult.rows.map(row => ({
                nombre: row.nombre as string
            }));
            
            // Crear un mapa para relacionar índices de parámetros antiguos con nuevos
            const mapeoParametros: Record<string, string> = {};
            if (parametrosAntiguos.length > 0 && parametros.length > 0) {
                // Mapear por posición si tienen la misma longitud
                if (parametrosAntiguos.length === parametros.length) {
                    for (let i = 0; i < parametrosAntiguos.length; i++) {
                        mapeoParametros[parametrosAntiguos[i].nombre] = parametros[i].nombre;
                    }
                }
            }

            // 3. Eliminar parámetros antiguos del producto principal
            await query('DELETE FROM producto_parametros WHERE producto_id = $1', [id]);

            // 4. Insertar nuevos parámetros para el producto principal
            if (tieneParametros && parametros.length > 0) {
                for (const param of parametros) {
                    await query(
                        'INSERT INTO producto_parametros (producto_id, nombre, cantidad) VALUES ($1, $2, $3)',
                        [id, param.nombre, param.cantidad]
                    );
                }
            }

            // 5. Obtener todos los vendedores que tienen este producto
            const vendedoresConProductoResult = await query(
                'SELECT usuario_id FROM usuario_productos WHERE producto_id = $1',
                [id]
            );
            
            // Convertir explícitamente los resultados al tipo deseado
            const vendedoresConProducto: UsuarioProducto[] = vendedoresConProductoResult.rows.map(row => ({
                usuario_id: row.usuario_id as string
            }));

            // 6. Para cada vendedor, actualizar sus parámetros
            for (const vendedor of vendedoresConProducto) {
                // 6.1 Obtener los parámetros actuales del vendedor con sus cantidades
                const parametrosVendedorResult = await query(
                    'SELECT nombre, cantidad FROM usuario_producto_parametros WHERE producto_id = $1 AND usuario_id = $2',
                    [id, vendedor.usuario_id]
                );
                
                // Convertir explícitamente los resultados al tipo deseado
                const parametrosVendedor: ParametroVendedor[] = parametrosVendedorResult.rows.map(row => ({
                    nombre: row.nombre as string,
                    cantidad: row.cantidad as number
                }));
                
                // Crear un mapa de los parámetros actuales del vendedor para acceso rápido
                const mapaParametrosVendedor: Record<string, number> = {};
                parametrosVendedor.forEach(param => {
                    mapaParametrosVendedor[param.nombre] = param.cantidad;
                });
                
                // 6.2 Eliminar parámetros antiguos del vendedor
                await query(
                    'DELETE FROM usuario_producto_parametros WHERE producto_id = $1 AND usuario_id = $2',
                    [id, vendedor.usuario_id]
                );

                // 6.3 Insertar parámetros actualizados para el vendedor
                if (tieneParametros && parametros.length > 0) {
                    for (const param of parametros) {
                        let cantidadFinal = param.cantidad; // Valor predeterminado
                        
                        // Buscar si existe un mapeo directo de parámetro antiguo a nuevo
                        for (const nombreAntiguo in mapeoParametros) {
                            if (mapeoParametros[nombreAntiguo] === param.nombre && 
                                mapaParametrosVendedor[nombreAntiguo] !== undefined) {
                                cantidadFinal = mapaParametrosVendedor[nombreAntiguo];
                                break;
                            }
                        }
                        
                        // Si no hay mapeo, buscar si ya existía un parámetro con el mismo nombre
                        if (mapaParametrosVendedor[param.nombre] !== undefined) {
                            cantidadFinal = mapaParametrosVendedor[param.nombre];
                        }
                        
                        await query(
                            'INSERT INTO usuario_producto_parametros (producto_id, usuario_id, nombre, cantidad) VALUES ($1, $2, $3, $4)',
                            [id, vendedor.usuario_id, param.nombre, cantidadFinal]
                        );
                    }
                }
            }

            await query('COMMIT');

            const productoActualizado = await obtenerProductoConParametros(id);
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
    try {
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

            // 2. Eliminar merma_parametros primero
            const mermaParametrosEliminados = await query(
                'DELETE FROM merma_parametros WHERE merma_id IN (SELECT id FROM merma WHERE producto_id = $1) RETURNING *',
                [id]
            );

            // 3. Eliminar registros de merma
            const mermaEliminada = await query(
                'DELETE FROM merma WHERE producto_id = $1 RETURNING *',
                [id]
            );

            // 4. Eliminar referencias en usuario_productos
            const usuarioProductosEliminados = await query(
                'DELETE FROM usuario_productos WHERE producto_id = $1 RETURNING *',
                [id]
            );

            // 5. Eliminar transaccion_parametros primero
            const transaccionParametrosEliminados = await query(
                'DELETE FROM transaccion_parametros WHERE transaccion_id IN (SELECT id FROM transacciones WHERE producto = $1) RETURNING *',
                [id]
            );

            // 6. Ahora sí eliminar transacciones
            const transaccionesEliminadas = await query(
                'DELETE FROM transacciones WHERE producto = $1 RETURNING *',
                [id]
            );

            // 7. Eliminar parámetros si existen
            let parametrosEliminados = 0;
            if (producto.rows[0].tiene_parametros) {
                const result = await query(
                    'DELETE FROM producto_parametros WHERE producto_id = $1 RETURNING *',
                    [id]
                );
                parametrosEliminados = result.rows.length;
            }

            // 8. Eliminar referencias en usuario_producto_parametros
            const usuarioProductoParametrosEliminados = await query(
                'DELETE FROM usuario_producto_parametros WHERE producto_id = $1 RETURNING *',
                [id]
            );

            // 9. Eliminar referencias en venta_parametros
            const ventaParametrosEliminados = await query(
                'DELETE FROM venta_parametros WHERE venta_id IN (SELECT id FROM ventas WHERE producto = $1) RETURNING *',
                [id]
            );

            // 10. Eliminar referencias en ventas
            const ventasEliminadas = await query(
                'DELETE FROM ventas WHERE producto = $1 RETURNING *',
                [id]
            );

            // 11. Finalmente eliminar el producto
            await query('DELETE FROM productos WHERE id = $1', [id]);

            await query('COMMIT');

            return NextResponse.json({
                message: 'Producto eliminado exitosamente',
                deletedProduct: producto.rows[0],
                deletedData: {
                    mermaParametros: mermaParametrosEliminados.rows.length,
                    merma: mermaEliminada.rows.length,
                    usuarioProductos: usuarioProductosEliminados.rows.length,
                    transaccionParametros: transaccionParametrosEliminados.rows.length,
                    transacciones: transaccionesEliminadas.rows.length,
                    parametros: parametrosEliminados,
                    usuarioProductoParametros: usuarioProductoParametrosEliminados.rows.length,
                    ventaParametros: ventaParametrosEliminados.rows.length,
                    ventas: ventasEliminadas.rows.length
                }
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

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching vendor products:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
