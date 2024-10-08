import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Usuario, { IUsuario } from '@/models/Usuario';
import { generateToken } from '@/lib/auth';
import { Document } from 'mongoose';

export async function POST(request: NextRequest) {
  await dbConnect();

  const { nombre, password }: { nombre: string; password: string } = await request.json();

  const user = await Usuario.findOne({ nombre }) as (IUsuario & Document) | null;

  if (!user || !(await user.comparePassword(password))) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  // Convertimos el usuario a un formato compatible con generateToken
  const userForToken = {
    _id: user._id.toString(),
    nombre: user.nombre,
    rol: user.rol
  };

  const token: string = generateToken(userForToken);

  const response: NextResponse = NextResponse.json({
    id: userForToken._id,
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