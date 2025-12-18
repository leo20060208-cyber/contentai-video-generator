import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/upload
 * Upload de imagen (mock - convierte a data URL)
 * En producción, esto subiría a Google Cloud Storage
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

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validar tamaño (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum 10MB' },
        { status: 400 }
      );
    }

    // Mock: Convertir a data URL (en producción, subir a GCS)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Simular delay de upload
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
      fileName: file.name,
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

/* 
 * Implementación real con Google Cloud Storage (para más adelante):
 * 
 * import { Storage } from '@google-cloud/storage';
 * 
 * const storage = new Storage({
 *   projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
 * });
 * 
 * const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
 * 
 * export async function POST(request: Request) {
 *   const formData = await request.formData();
 *   const file = formData.get('file') as File;
 *   
 *   const fileName = `uploads/${Date.now()}-${file.name}`;
 *   const blob = bucket.file(fileName);
 *   
 *   const arrayBuffer = await file.arrayBuffer();
 *   await blob.save(Buffer.from(arrayBuffer), {
 *     contentType: file.type,
 *   });
 *   
 *   const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
 *   
 *   return NextResponse.json({
 *     success: true,
 *     imageUrl: publicUrl,
 *   });
 * }
 */

