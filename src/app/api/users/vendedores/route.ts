import { NextRequest, NextResponse } from 'next/server';
import { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies.token
  const decoded = verifyToken(token)

  if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const { id } = req.query

  if (req.method === 'PUT') {
    const { nombre, telefono } = req.body

    try {
      const result = await query(
        'UPDATE usuarios SET nombre = $1, telefono = $2 WHERE id = $3 RETURNING id, nombre, telefono, rol',
        [nombre, telefono, id]
      )

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Vendedor no encontrado' })
      }

      res.status(200).json(result.rows[0])
    } catch (error) {
      console.error('Error al actualizar vendedor:', error)
      res.status(500).json({ error: 'Error al actualizar vendedor' })
    }
  } else {
    res.setHeader('Allow', ['PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE rol = $1', ['Vendedor']);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener vendedores:', error);
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 });
  }
}