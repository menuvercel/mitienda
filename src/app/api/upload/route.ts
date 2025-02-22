import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { cloudinary } from '@/lib/cloudinary';

// Constantes de validación
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_DIMENSION = 2000;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validaciones iniciales
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido' },
        { status: 400 }
      );
    }

    // Convertir a buffer
    const buffer = await file.arrayBuffer();

    // Obtener metadata de la imagen
    const metadata = await sharp(Buffer.from(buffer)).metadata();

    // Validar dimensiones si existen
    if (metadata.width && metadata.height) {
      if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
        return NextResponse.json(
          { error: 'Las dimensiones de la imagen son demasiado grandes' },
          { status: 400 }
        );
      }
    }

    // Calcular dimensiones optimizadas
    let targetWidth = DEFAULT_WIDTH;
    let targetHeight = DEFAULT_HEIGHT;

    if (metadata.width && metadata.height) {
      targetWidth = Math.min(metadata.width, DEFAULT_WIDTH);
      targetHeight = Math.round((targetWidth * metadata.height) / metadata.width);
    }

    // Procesar imagen
    const processedImageBuffer = await sharp(Buffer.from(buffer))
      .resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Generar nombre único
    const uniqueFilename = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "")}`;

    // Subir a Cloudinary con tipado
    interface CloudinaryUploadResult {
      secure_url: string;
      public_id: string;
      width: number;
      height: number;
      format: string;
      resource_type: string;
      bytes: number;
      created_at: string;
    }

    const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'image',
            folder: 'mi-aplicacion',
            public_id: uniqueFilename,
            format: 'webp',
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
              { flags: 'sanitize' },
            ],
            tags: ['web-upload'],
          },
          (error, result) => {
            if (error) reject(error);
            if (!result) reject(new Error('No se recibió resultado de Cloudinary'));
            resolve(result as CloudinaryUploadResult);
          }
        )
        .end(processedImageBuffer);
    });

    // Preparar respuesta
    const response = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      resourceType: uploadResult.resource_type,
      size: uploadResult.bytes,
      createdAt: uploadResult.created_at,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en el proceso de upload:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar o subir el archivo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 30,
  },
};
