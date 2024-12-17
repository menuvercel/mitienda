import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

export interface DecodedToken {
  id: string;
  rol: string;
  // Add any other properties that might be in your token
}

export interface User {
  _id: string;
  rol: string;
}

export function generateToken(user: { id: string; nombre: string; rol: string }) {
  return jwt.sign(user, SECRET_KEY, { expiresIn: '1d' });
}

export function verifyToken(token: string | undefined) {
  if (!token) {
    throw new Error('Token no proporcionado');
  }
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    }
    throw new Error('Error de verificación de token');
  }
}
