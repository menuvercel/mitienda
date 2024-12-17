import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

// app/api/ventas/route.ts
export async function POST(request: NextRequest) {
  try {
      const token = request.cookies.get('token')?.value;
      const decoded = verifyToken(token) as DecodedToken | null;

      if (!decoded || decoded.rol !== 'Ventas') {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      const body = await request.json();
      const { producto: productoId, cantidad, precio_unitario } = body;

      await query('BEGIN');

      try {
          // 1. Verificar si el producto existe
          const productoResult = await query(
              'SELECT * FROM productos WHERE id = $1',
              [productoId]
          );

          if (productoResult.rows.length === 0) {
              await query('ROLLBACK');
              return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
          }

          // 2. Verificar stock
          if (productoResult.rows[0].stock < cantidad) {
              await query('ROLLBACK');
              return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
          }

          // 3. Calcular el total
          const total = cantidad * precio_unitario;

          // 4. Insertar la venta (solo con los campos que existen en la tabla)
          const ventaResult = await query(
              'INSERT INTO ventas (producto, cantidad, precio_unitario, total, vendedor, fecha) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
              [productoId, cantidad, precio_unitario, total, decoded.id]
          );

          // 5. Actualizar el stock
          await query(
              'UPDATE productos SET stock = stock - $1 WHERE id = $2',
              [cantidad, productoId]
          );

          await query('COMMIT');

          return NextResponse.json({
              message: 'Venta registrada exitosamente',
              venta: ventaResult.rows[0]
          });

      } catch (error) {
          await query('ROLLBACK');
          throw error;
      }

  } catch (error) {
      console.error('Error in POST function:', error);
      return NextResponse.json({ 
          error: 'Error interno del servidor', 
          details: (error as Error).message 
      }, { status: 500 });
  }
}


export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vendedorId = searchParams.get('vendedorId');
  const productoId = searchParams.get('productoId');
  const ventaId = searchParams.get('id'); // Añadimos el parámetro id

  try {
    let result;
    
    // Si se proporciona un ID de venta específico
    if (ventaId) {
      result = await query(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.id = $1`,
        [ventaId]
      );

      // Si no se encuentra la venta
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]); // Retornamos solo la venta específica
    }
    
    // Lógica existente para filtrar por producto
    if (productoId) {
      result = await query(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.producto = $1
         ORDER BY v.fecha DESC`,
        [productoId]
      );
    } 
    // Lógica existente para filtrar por vendedor
    else if (vendedorId) {
      result = await query(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.vendedor = $1
         ORDER BY v.fecha DESC`,
        [vendedorId]
      );
    } 
    // Si no se proporciona ningún filtro
    else {
      return NextResponse.json({ error: 'Se requiere vendedorId, productoId o id' }, { status: 400 });
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ error: 'Error al obtener ventas', details: (error as Error).message }, { status: 500 });
  }
}