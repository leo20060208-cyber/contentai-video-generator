import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get('id');

        console.log('[DELETE] Request to delete video:', videoId);

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const authHeader = req.headers.get('authorization');

        // Verify auth header exists
        if (!authHeader) {
            console.log('[DELETE] No auth header');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[DELETE] Missing URL or Anon Key');
            return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
        }

        // Initialize Supabase Client with User Context (RLS)
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // 1. Get video details first (using maybeSingle to handle 0 results gracefully)
        const { data: videoData, error: fetchError } = await supabase
            .from('videos')
            .select('*')
            .eq('id', videoId)
            .maybeSingle();

        console.log('[DELETE] Video fetch result:', {
            found: !!videoData,
            title: videoData?.title,
            error: fetchError?.message
        });

        // 2. Helper to extract path from Supabase Storage URL
        const getPathFromUrl = (url: string): { bucket: string; path: string } | null => {
            try {
                if (!url) return null;
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/');
                const publicIndex = pathParts.indexOf('public');
                if (publicIndex !== -1 && publicIndex < pathParts.length - 2) {
                    return {
                        bucket: pathParts[publicIndex + 1],
                        path: pathParts.slice(publicIndex + 2).join('/')
                    };
                }
                return null;
            } catch {
                return null;
            }
        };

        // 3. Delete storage files if they exist in Supabase Storage
        if (videoData) {
            if (videoData.video_url && videoData.video_url.includes('supabase')) {
                const details = getPathFromUrl(videoData.video_url);
                console.log('[DELETE] Video file path:', details);
                if (details) {
                    const { error } = await supabase.storage.from(details.bucket).remove([details.path]);
                    console.log('[DELETE] Video file deleted:', error ? error.message : 'OK');
                }
            }

            if (videoData.thumbnail_url && videoData.thumbnail_url.includes('supabase')) {
                const details = getPathFromUrl(videoData.thumbnail_url);
                if (details) {
                    await supabase.storage.from(details.bucket).remove([details.path]);
                }
            }

            if (videoData.audio_url && videoData.audio_url.includes('supabase')) {
                const details = getPathFromUrl(videoData.audio_url);
                if (details) {
                    await supabase.storage.from(details.bucket).remove([details.path]);
                }
            }
        }

        // 4. Delete the database record
        const { error: deleteError, count } = await supabase
            .from('videos')
            .delete({ count: 'exact' })
            .eq('id', videoId);

        console.log('[DELETE] DB delete result:', { error: deleteError?.message, rowsDeleted: count });

        if (deleteError) {
            console.error('[DELETE] DB delete error:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        console.log('[DELETE] Video deleted successfully:', videoId, 'Rows:', count);
        return NextResponse.json({ success: true, message: 'Video deleted successfully', count });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('[DELETE] Unexpected error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
