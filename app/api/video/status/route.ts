
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { KlingClient } from '@/lib/kling';
import { FreepikClient } from '@/lib/freepik';
import { createReplicatePrediction, getReplicatePredictionStatus } from '@/lib/replicate';
import { AtlasClient } from '@/lib/atlas';
import { WavespeedClient } from '@/lib/wavespeed';

const klingClient = new KlingClient({
    accessKey: process.env.KLING_ACCESS_KEY || '',
    secretKey: process.env.KLING_SECRET_KEY || ''
});

const freepikClient = new FreepikClient();
const atlasClient = new AtlasClient();
const wavespeedClient = new WavespeedClient();

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');
        const urlProvider = searchParams.get('provider'); // 'kling', 'replicate', or 'freepik'

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        // Initialize Supabase to update video status
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabaseKey = serviceRoleKey || anonKey;
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log(`[Status] Initialized Supabase Client. Key Type: ${serviceRoleKey ? 'ServiceRole (Admin)' : 'Anon (Public)'}`);

        // Fetch video record for context (model, ownership) and updating
        const { data: videos } = await supabase
            .from('videos')
            .select('*')
            .eq('task_id', taskId)
            .limit(1);

        const videoRecord = videos && videos.length > 0 ? videos[0] : null;

        // Use Provider from DB if available (Source of Truth), otherwise fallback to URL param
        const provider = videoRecord?.provider || urlProvider;

        // Helper to update DB
        const updateDb = async (status: string, videoUrl: string | null) => {
            if (!videoRecord) return;
            // Only update if status changed or url is new
            if (videoRecord.status !== status || (videoUrl && !videoRecord.video_url)) {
                const updateData: any = { status };
                if (videoUrl) updateData.video_url = videoUrl;

                await supabase
                    .from('videos')
                    .update(updateData)
                    .eq('task_id', taskId);
            }
        };

        // Helper to upload to Supabase
        const uploadToSupabase = async (url: string, taskId: string): Promise<string | null> => {
            try {
                console.log(`[Status] Downloading video from provider: ${url}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to fetch video from provider');

                const blob = await response.blob();
                const fileName = `${taskId}.mp4`; // Use task ID for uniqueness and simple lookup

                // Upload to 'videos' bucket
                const { data, error } = await supabase.storage
                    .from('videos')
                    .upload(fileName, blob, {
                        contentType: 'video/mp4',
                        upsert: true
                    });

                if (error) {
                    console.error('[Status] Persistence Error:', error);
                    return null; // Fallback to original URL if upload fails?
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('videos')
                    .getPublicUrl(fileName);

                console.log(`[Status] Video uploaded to Supabase: ${publicUrl}`);
                return publicUrl;
            } catch (err) {
                console.error('[Status] Persistence Error:', err);
                return null;
            }
        };

        const createSignedIfSupabaseUrl = async (url: string): Promise<{ url: string; storagePath: string | null }> => {
            const m =
                url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/) ||
                url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/) ||
                url.match(/\/storage\/v1\/object\/([^/]+)\/(.+)$/);
            if (!m) return { url, storagePath: null };
            const bucket = m[1];
            if (bucket !== 'videos') return { url, storagePath: null };
            const storagePath = m[2].split('?')[0] || null;
            if (!storagePath) return { url, storagePath: null };
            try {
                const signed = await supabase.storage.from('videos').createSignedUrl(storagePath, 60 * 60);
                if (signed.data?.signedUrl) return { url: signed.data.signedUrl, storagePath };
            } catch (e) {
                // ignore
            }
            return { url, storagePath };
        };

        // 0. Handle Wavespeed (New Priority)
        if (provider === 'wavespeed') {
            try {
                const result = await wavespeedClient.getTaskStatus(taskId);

                let status = result.status;
                let videoUrl = result.url;
                const statusMessage = result.errorMessage ||
                    (typeof (result.data as any)?.error === 'string'
                        ? (result.data as any).error
                        : (typeof (result.data as any)?.message === 'string' ? (result.data as any).message : null));
                let storagePath: string | null = null;

                if (status === 'completed' && videoUrl) {
                    const persistentUrl = await uploadToSupabase(videoUrl, taskId);
                    videoUrl = persistentUrl || videoUrl;
                    const signed = await createSignedIfSupabaseUrl(videoUrl);
                    videoUrl = signed.url;
                    storagePath = signed.storagePath;
                }

                await updateDb(status, videoUrl || null);

                return NextResponse.json({
                    code: 0,
                    message: 'success',
                    data: {
                        status,
                        taskId,
                        video: videoUrl ? { url: videoUrl, storagePath } : null,
                        statusMessage,
                        error: status === 'failed' ? statusMessage : null
                    }
                });
            } catch (err) {
                console.error('[Status] Wavespeed error:', err);
                return NextResponse.json({ error: (err as Error).message }, { status: 500 });
            }
        }



        // 0. Handle Atlas Cloud
        if (provider === 'atlas') {
            try {
                const result = await atlasClient.getTaskStatus(taskId);
                // { status: 'completed'|'processing'|'failed', url: '...' | null }

                let status = result.status;
                let videoUrl = result.url;

                if (status === 'completed' && videoUrl) {
                    // PERSISTENCE
                    const persistentUrl = await uploadToSupabase(videoUrl, taskId);
                    videoUrl = persistentUrl || videoUrl;
                }

                await updateDb(status, videoUrl || null);

                return NextResponse.json({
                    code: 0,
                    message: 'success',
                    data: {
                        status,
                        taskId,
                        video: videoUrl ? { url: videoUrl } : null
                    }
                });

            } catch (err) {
                console.error('[Status] Atlas error:', err);
                return NextResponse.json({ error: (err as Error).message }, { status: 500 });
            }
        }

        // 1. Handle Freepik
        if (provider === 'freepik') {
            const model = videoRecord?.model || 'kling-v2-1-std';
            console.log(`[Status] Checking Freepik for task ${taskId} (model: ${model})`);

            try {
                const result = await freepikClient.getTaskStatus(taskId, model);
                // Freepik structure: { data: { status: 'COMPLETED', generated: [{url: '...'}] } }

                const remoteStatus = result.data?.status; // CREATED, PENDING, COMPLETED, FAILED
                console.log(`[Status] Remote status for ${taskId}: ${remoteStatus}`); // User feedback

                let status = 'processing';
                let videoUrl = null;

                if (remoteStatus === 'COMPLETED' || remoteStatus === 'SUCCEEDED') {
                    status = 'completed';
                    if (result.data?.generated?.length > 0) {
                        const tempUrl = result.data.generated[0].url;
                        // PERSISTENCE LAYER: Download & Upload
                        const persistentUrl = await uploadToSupabase(tempUrl, taskId);
                        videoUrl = persistentUrl || tempUrl;
                    }
                } else if (remoteStatus === 'FAILED') {
                    status = 'failed';
                }

                await updateDb(status, videoUrl);

                return NextResponse.json({
                    code: 0,
                    message: 'success',
                    data: {
                        status,
                        taskId,
                        video: videoUrl ? { url: videoUrl } : null
                    }
                });
            } catch (err) {
                console.error('[Status] Freepik error:', err);
                return NextResponse.json({ error: (err as Error).message }, { status: 500 });
            }
        }

        // 2. Handle Replicate
        if (provider === 'replicate') {
            const prediction = await getReplicatePredictionStatus(taskId);
            // Replicate status: starting, processing, succeeded, failed, canceled

            let status = 'processing';
            let outputUrl = null;

            if (prediction.status === 'succeeded') {
                status = 'completed';
                outputUrl = prediction.output;
            } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
                status = 'failed';
            }

            // Replicate returns array or string depending on model? usually string or array of strings.
            // If output is array, take first?
            let dbUrl = outputUrl;
            if (Array.isArray(outputUrl)) {
                dbUrl = outputUrl[0]; // naive handling
            } else if (typeof outputUrl === 'object') {
                // sometimes object?
                dbUrl = JSON.stringify(outputUrl);
            }

            // PERSISTENCE LAYER for Replicate
            if (status === 'completed' && dbUrl && typeof dbUrl === 'string' && dbUrl.startsWith('http')) {
                const persistentUrl = await uploadToSupabase(dbUrl, taskId);
                dbUrl = persistentUrl || dbUrl;
                outputUrl = dbUrl; // Update outputUrl for JSON response too
            }

            await updateDb(status, dbUrl as string);

            return NextResponse.json({
                code: 0,
                message: 'success',
                data: {
                    status,
                    taskId: prediction.id,
                    video: outputUrl ? { url: outputUrl } : null
                }
            });
        }

        // 3. Default to Kling (Legacy)
        const result = await klingClient.getTaskStatus(taskId);

        if (result.code === 0) {
            // Check success
            // Kling response: { data: { task_status: 'succeed', task_result: { videos: [{url: ...}] } } }
            // Adjust based on KlingClient return type. 
            // Assuming result.data matches standard Kling response

            const kStatus = result.data.task_status;
            let status = 'processing';
            let videoUrl = null;

            if (kStatus === 'succeed') {
                status = 'completed';
                const vids = result.data.task_result?.videos;
                if (vids && vids.length > 0) {
                    const tempUrl = vids[0].url;
                    // PERSISTENCE LAYER: Download & Upload
                    const persistentUrl = await uploadToSupabase(tempUrl, taskId);
                    videoUrl = persistentUrl || tempUrl; // Fallback if upload fails
                }
            } else if (kStatus === 'failed') {
                status = 'failed';
            }

            await updateDb(status, videoUrl);

            return NextResponse.json(result.data);
        } else {
            return NextResponse.json(
                { error: result.message || 'Failed to fetch status' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
