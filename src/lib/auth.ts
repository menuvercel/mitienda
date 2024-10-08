import jwt from 'jsonwebtoken';

export interface DecodedToken {
  id: string;
  rol: string;
  // Add any other properties that might be in your token
}

export interface User {
  _id: string;
  rol: string;
}

export function generateToken(user: { _id: string; nombre: string; rol: string }) {
  return jwt.sign(
    { id: user._id, nombre: user.nombre, rol: user.rol },
    process.env.JWT_SECRET as string,
    { expiresIn: '1d' }
  );
}

export function verifyToken(token: string | undefined): DecodedToken | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  try {
    return jwt.verify(token as string, secret) as DecodedToken;
  } catch (error) {
    return null;
  }
}