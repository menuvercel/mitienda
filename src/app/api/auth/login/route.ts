import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcrypt';


export async function POST(request: NextRequest) {
  const { nombre, password }: { nombre: string; password: string } = await request.json();

  const result = await query('SELECT * FROM usuarios WHERE nombre = $1', [nombre]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const userForToken = {
    id: user.id.toString(), // Ensure ID is a string
    nombre: user.nombre,
    rol: user.rol
  };

  const token: string = generateToken(userForToken);

  const response: NextResponse = NextResponse.json({
    id: userForToken.id,
    nombre: userForToken.nombre,
    rol: userForToken.rol,
    token
  });

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 86400,
    path: '/',
  });

  return response;
}