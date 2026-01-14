import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
    request: NextRequest,
    { params }: { params: { taskId: string } }
) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // Get user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId } = params;

        // Check Wavespeed API for task status
        const wavespeedResponse = await fetch(`https://api.wavespeed.ai/v1/task/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.WAVESPEED_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!wavespeedResponse.ok) {
            const errorData = await wavespeedResponse.json().catch(() => ({}));
            return NextResponse.json({
                error: 'Failed to fetch task status',
                details: errorData
            }, { status: 500 });
        }

        const wavespeedData = await wavespeedResponse.json();

        // Update our database
        await supabase
            .from('magic_video_tasks')
            .update({
                status: wavespeedData.status,
                updated_at: new Date().toISOString()
            })
            .eq('task_id', taskId)
            .eq('user_id', user.id);

        // If completed, download and store video
        if (wavespeedData.status === 'completed' && wavespeedData.result?.video_url) {
            const videoUrl = wavespeedData.result.video_url;

            // Download video
            const videoResponse = await fetch(videoUrl);
            if (!videoResponse.ok) {
                throw new Error('Failed to download video');
            }

            const videoBlob = await videoResponse.blob();
            const videoBuffer = await videoBlob.arrayBuffer();

            // Upload to Supabase Storage
            const fileName = `magic-video/${user.id}/${taskId}.mp4`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('videos')
                .upload(fileName, videoBuffer, {
                    contentType: 'video/mp4',
                    upsert: true
                });

            if (uploadError) {
                console.error('Failed to upload video:', uploadError);
            } else {
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('videos')
                    .getPublicUrl(fileName);

                // Get task info to determine type
                const { data: taskInfo } = await supabase
                    .from('magic_video_tasks')
                    .select('type, input_data')
                    .eq('task_id', taskId)
                    .eq('user_id', user.id)
                    .single();

                // Save to user_videos table
                await supabase
                    .from('user_videos')
                    .insert({
                        user_id: user.id,
                        video_url: publicUrl,
                        prompt: taskInfo?.input_data?.prompt || 'Magic video generation',
                        reference_image: taskInfo?.input_data?.imageUrl || taskInfo?.input_data?.startImage,
                        generation_type: taskInfo?.type || 'magic-video',
                        duration: wavespeedData.result.duration || 5
                    });

                // Update task with final video URL
                await supabase
                    .from('magic_video_tasks')
                    .update({
                        result_video_url: publicUrl,
                        status: 'completed'
                    })
                    .eq('task_id', taskId)
                    .eq('user_id', user.id);

                return NextResponse.json({
                    status: 'completed',
                    videoUrl: publicUrl,
                    duration: wavespeedData.result.duration,
                    taskId
                });
            }
        }

        // Return current status
        return NextResponse.json({
            status: wavespeedData.status,
            taskId,
            estimatedTime: wavespeedData.estimated_time
        });

    } catch (error: any) {
        console.error('Status check error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            message: error.message
        }, { status: 500 });
    }
}
