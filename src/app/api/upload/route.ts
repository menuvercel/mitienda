import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
  }

  try {
    const blob = await put(file.name, file, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error al subir el archivo:', error);
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 });
  }
}