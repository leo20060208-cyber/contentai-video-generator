import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sanitizeStorageFileName = (inputName: string): string => {
  const normalized = (inputName || 'file')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'file';
};

/**
 * POST /api/storage/upload
 *
 * Uploads a file/blob to Supabase Storage using Service Role (bypasses RLS).
 *
 * FormData:
 * - file: File
 * - prefix: string (e.g. "user-videos" | "frames" | "products")
 *
 * Auth:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - { success, storagePath, signedUrl }
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const form = await request.formData();
    const file = form.get('file');
    const prefixRaw = form.get('prefix');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }
    if (typeof prefixRaw !== 'string' || prefixRaw.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Missing prefix' }, { status: 400 });
    }

    const prefix = prefixRaw.trim().replace(/^\/+|\/+$/g, '');
    const safeName = sanitizeStorageFileName(file.name);
    const storagePath = `${prefix}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from('videos').upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true
    });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 400 });
    }

    const signed = await supabase.storage.from('videos').createSignedUrl(storagePath, 60 * 60); // 1h
    const signedUrl = signed.data?.signedUrl || null;

    return NextResponse.json({
      success: true,
      storagePath,
      signedUrl
    });
  } catch (e) {
    console.error('[storage/upload] error', e);
    return NextResponse.json({ success: false, error: (e as Error).message || 'Upload failed' }, { status: 500 });
  }
}

