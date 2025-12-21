import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

function sign(secret: string, path: string, exp: string): string {
  return crypto.createHmac('sha256', secret).update(`${path}|${exp}`).digest('hex');
}

/**
 * GET /api/storage/public?path=<objectPath>&exp=<unix>&sig=<hmac>
 *
 * Streams a Supabase Storage object (bucket: videos) via server-side download.
 * This avoids providers failing to fetch Supabase signed URLs.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const objectPath = searchParams.get('path');
    const exp = searchParams.get('exp');
    const sig = searchParams.get('sig');

    if (!objectPath || !exp || !sig) {
      return NextResponse.json({ error: 'Missing path/exp/sig' }, { status: 400 });
    }

    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || expNum <= 0) {
      return NextResponse.json({ error: 'Invalid exp' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (expNum < now) {
      return NextResponse.json({ error: 'Expired' }, { status: 403 });
    }

    const secret = process.env.STORAGE_PROXY_SECRET || serviceRoleKey;
    const expected = sign(secret, objectPath, exp);
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const { data, error } = await supabase.storage.from('videos').download(objectPath);
    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    // Best-effort content-type inference by extension
    const lower = objectPath.toLowerCase();
    const contentType =
      lower.endsWith('.mp4') ? 'video/mp4'
        : lower.endsWith('.mov') ? 'video/quicktime'
          : lower.endsWith('.png') ? 'image/png'
            : (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) ? 'image/jpeg'
              : 'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache until exp (CDNs can cache safely)
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (e) {
    console.error('[storage/public] error', e);
    return NextResponse.json({ error: (e as Error).message || 'Internal error' }, { status: 500 });
  }
}

