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
  const normalized = (inputName || 'mask')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'mask';
};

/**
 * POST /api/masks/save
 *
 * Body: { maskUrl: string, name?: string }
 * Auth: Authorization: Bearer <access_token>
 *
 * Downloads maskUrl server-side, uploads into Storage bucket "masks",
 * then inserts a row into "user_masks".
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const body = await request.json();
    const maskUrl = typeof body?.maskUrl === 'string' ? body.maskUrl : null;
    const name = typeof body?.name === 'string' && body.name.trim().length > 0 ? body.name.trim() : 'Untitled Mask';

    if (!maskUrl) {
      return NextResponse.json({ success: false, error: 'maskUrl is required' }, { status: 400 });
    }

    const res = await fetch(maskUrl);
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Failed to fetch maskUrl (${res.status})` }, { status: 400 });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeName = sanitizeStorageFileName(name);
    const filePath = `${userId}/${Date.now()}_${safeName}.png`;

    const { error: uploadError } = await supabase.storage.from('masks').upload(filePath, buffer, {
      contentType,
      upsert: true
    });
    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 400 });
    }

    const { data: { publicUrl } } = supabase.storage.from('masks').getPublicUrl(filePath);

    const { data: row, error: dbError } = await supabase
      .from('user_masks')
      .insert({ user_id: userId, url: publicUrl, name })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, mask: row });
  } catch (e) {
    console.error('[masks/save] error', e);
    return NextResponse.json({ success: false, error: (e as Error).message || 'Save failed' }, { status: 500 });
  }
}

