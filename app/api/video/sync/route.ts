
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FreepikClient } from '@/lib/freepik';

export const runtime = 'nodejs';

export async function GET() {
    console.log('[Sync] Starting sync for processing videos...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const freepikClient = new FreepikClient(process.env.FREEPIK_API_KEY || 'FPSXac3ab50377507aedba82018d37063927');

    try {
        // 1. Fetch all 'processing' videos
        const { data: processingVideos, error } = await supabase
            .from('videos')
            .select('*')
            .eq('status', 'processing');

        if (error) throw error;
        if (!processingVideos || processingVideos.length === 0) {
            return NextResponse.json({ message: 'No processing videos found', updated: 0 });
        }

        console.log(`[Sync] Found ${processingVideos.length} processing videos.`);

        const updates = [];

        // 2. Check status for each
        for (const video of processingVideos) {
            if (!video.task_id) continue;

            try {
                // Determine model slug (defaulting if missing)
                const model = video.model || 'kling-v2-1-std';
                const result = await freepikClient.getTaskStatus(video.task_id, model);

                const remoteStatus = result.data?.status; // CREATED, PENDING, COMPLETED, FAILED
                let newStatus = 'processing';
                let newUrl = null;

                if (remoteStatus === 'COMPLETED' || remoteStatus === 'SUCCEEDED') {
                    newStatus = 'completed';
                    if (result.data?.generated?.length > 0) {
                        newUrl = result.data.generated[0].url;
                    }
                } else if (remoteStatus === 'FAILED') {
                    newStatus = 'failed';
                }

                // Update if changed
                if (newStatus !== 'processing') {
                    const updateData: any = { status: newStatus };
                    if (newUrl) updateData.video_url = newUrl;

                    await supabase
                        .from('videos')
                        .update(updateData)
                        .eq('id', video.id);

                    updates.push({ id: video.id, status: newStatus });
                }

            } catch (err) {
                console.error(`[Sync] Failed to check task ${video.task_id}:`, err);
                // Optional: mark as failed if 404 persists? 
                // For now, leave as processing unless actively confirmed failed.
                if ((err as Error).message.includes('not found')) {
                    // Maybe mark as failed?
                    // await supabase.from('videos').update({ status: 'failed' }).eq('id', video.id);
                }
            }
        }

        return NextResponse.json({
            message: 'Sync completed',
            processed: processingVideos.length,
            updated: updates
        });

    } catch (e) {
        console.error('[Sync] Error:', e);
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
