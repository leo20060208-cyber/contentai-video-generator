import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'templates', 'videos');

/**
 * POST /api/admin/upload
 * Upload de video al servidor local (public/templates/videos/)
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo (video)
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { success: false, error: 'File must be a video' },
        { status: 400 }
      );
    }

    // Validar tamaño (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum 100MB' },
        { status: 400 }
      );
    }

    // Crear directorio si no existe
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedName}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Guardar archivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    // URL pública del video
    const videoUrl = `/templates/videos/${fileName}`;

    return NextResponse.json({
      success: true,
      videoUrl,
      fileName,
      fileSize: file.size,
      mimeType: file.type,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}

