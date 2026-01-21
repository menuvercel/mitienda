import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  const { nombre, password }: { nombre: string; password: string } = await request.json();

  const result = await query('SELECT * FROM usuarios WHERE nombre = $1', [nombre]);
  const user = result.rows[0];



  if (!user || user.password !== password) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  // Generar token
  const secret = process.env.JWT_SECRET || 'secret';

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, rol: user.rol }, // Payload
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  return NextResponse.json({
    id: user.id.toString(),
    nombre: user.nombre,
    rol: user.rol,
    token // Retornar el token generado
  });
}
