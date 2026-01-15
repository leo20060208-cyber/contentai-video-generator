import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { WavespeedClient } from '@/lib/wavespeed';

const wavespeedClient = new WavespeedClient();

export async function GET(
    request: NextRequest,
    { params }: { params: { taskId: string } }
) {
    try {
        // === HYBRID AUTH STRATEGY ===
        const supabase = await createServerClient();
        let user = null;

        const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser();

        if (cookieUser && !cookieError) {
            user = cookieUser;
        } else {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const anonSupabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                const { data: { user: headerUser }, error: headerError } = await anonSupabase.auth.getUser(token);
                if (headerUser && !headerError) {
                    user = headerUser;
                }
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use admin client for database operations
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        const { taskId } = params;

        // Check Wavespeed API using Client (Handlers V3 logic)
        const statusResult = await wavespeedClient.getTaskStatus(taskId);

        // Update database with current status
        await adminSupabase
            .from('magic_video_tasks')
            .update({
                status: statusResult.status,
                updated_at: new Date().toISOString()
            })
            .eq('task_id', taskId)
            .eq('user_id', user.id);

        if (statusResult.status === 'completed' && statusResult.url) {
            const videoUrl = statusResult.url;

            // Check if we already have the result saved to avoid duplications/re-downloads
            const { data: existingTask } = await adminSupabase
                .from('magic_video_tasks')
                .select('result_video_url, type, input_data')
                .eq('task_id', taskId)
                .single();

            let publicUrl = existingTask?.result_video_url;

            if (!publicUrl) {
                // Download video
                const videoResponse = await fetch(videoUrl);
                if (!videoResponse.ok) {
                    throw new Error('Failed to download video from provider');
                }

                const videoBlob = await videoResponse.blob();
                const videoBuffer = await videoBlob.arrayBuffer();

                // Upload to Supabase Storage
                const fileName = `magic-video/${user.id}/${taskId}.mp4`;
                const { error: uploadError } = await adminSupabase.storage
                    .from('videos')
                    .upload(fileName, videoBuffer, {
                        contentType: 'video/mp4',
                        upsert: true
                    });

                if (uploadError) {
                    console.error('Failed to upload video:', uploadError);
                    // Fallback to original URL if upload fails
                    publicUrl = videoUrl;
                } else {
                    const { data: { publicUrl: storageUrl } } = adminSupabase.storage
                        .from('videos')
                        .getPublicUrl(fileName);
                    publicUrl = storageUrl;
                }

                // Save to main videos table (unified with other generators)
                await adminSupabase
                    .from('videos')
                    .insert({
                        user_id: user.id,
                        video_url: publicUrl,
                        prompt: existingTask?.input_data?.prompt || 'Magic video generation',
                        title: (existingTask?.input_data?.prompt || 'Magic Video').slice(0, 50),
                        model: existingTask?.type || 'magic-video',
                        thumbnail_url: existingTask?.input_data?.imageUrl || existingTask?.input_data?.startImage,
                        duration: String(existingTask?.input_data?.duration || 5),
                        status: 'completed',
                        views: 0
                    });

                // Update task
                await adminSupabase
                    .from('magic_video_tasks')
                    .update({
                        result_video_url: publicUrl,
                        status: 'completed'
                    })
                    .eq('task_id', taskId);
            }

            return NextResponse.json({
                status: 'completed',
                videoUrl: publicUrl,
                taskId
            });
        } else if (statusResult.status === 'failed') {
            return NextResponse.json({
                status: 'failed',
                taskId,
                message: 'Generation failed at provider'
            });
        }

        // Return processing status
        return NextResponse.json({
            status: statusResult.status,
            taskId
        });

    } catch (error: any) {
        console.error('Status check error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            message: error.message
        }, { status: 500 });
    }
}
