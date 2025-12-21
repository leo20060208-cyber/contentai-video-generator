import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET() {
  const result: {
    user_masks: { ok: boolean; error?: string; code?: string };
    masks_bucket: { ok: boolean; error?: string };
  } = {
    user_masks: { ok: false },
    masks_bucket: { ok: false }
  };

  // 1) Check table user_masks exists
  try {
    const { error } = await supabase.from('user_masks').select('id').limit(1);
    if (error) {
      result.user_masks = { ok: false, error: error.message, code: (error as unknown as { code?: string }).code };
    } else {
      result.user_masks = { ok: true };
    }
  } catch (e) {
    result.user_masks = { ok: false, error: (e as Error).message };
  }

  // 2) Check bucket masks exists
  try {
    const storageApi = supabase.storage as unknown as {
      listBuckets?: () => Promise<{ data?: Array<{ name: string }>; error?: { message?: string } }>;
    };
    if (!storageApi.listBuckets) {
      result.masks_bucket = { ok: false, error: 'storage.listBuckets not available in this supabase-js build' };
    } else {
      const { data, error } = await storageApi.listBuckets();
      if (error) {
        result.masks_bucket = { ok: false, error: error.message || 'Failed to list buckets' };
      } else {
        const has = (data || []).some(b => b.name === 'masks');
        result.masks_bucket = has ? { ok: true } : { ok: false, error: 'Bucket "masks" not found' };
      }
    }
  } catch (e) {
    result.masks_bucket = { ok: false, error: (e as Error).message };
  }

  return NextResponse.json({
    success: true,
    checks: result,
    needs_sql: !result.user_masks.ok,
    needs_bucket: !result.masks_bucket.ok
  });
}

