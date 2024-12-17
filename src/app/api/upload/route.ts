import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';

export async function POST(request: NextRequest) {

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
  }

  try {
    // Convertir el archivo a un buffer
    const buffer = await file.arrayBuffer();

    // Procesar la imagen con sharp
    const processedImageBuffer = await sharp(buffer)
      .resize(800, 600, { // Redimensionar a 800x600 o la resolución que prefieras
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 }) // Convertir a WebP con calidad del 80%
      .toBuffer();

    // Generar un nombre único para el archivo
    const fileName = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "")}.webp`;

    // Subir el archivo procesado
    const blob = await put(fileName, processedImageBuffer, {
      access: 'public',
      contentType: 'image/webp'
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error al procesar o subir el archivo:', error);
    return NextResponse.json({ error: 'Error al procesar o subir el archivo' }, { status: 500 });
  }
}