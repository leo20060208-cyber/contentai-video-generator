import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { WavespeedClient } from '@/lib/wavespeed';

// Initialize Wavespeed client
const wavespeedClient = new WavespeedClient();

export async function POST(request: NextRequest) {
    try {
        // === HYBRID AUTH STRATEGY ===
        // 1. Try cookie-based auth first (Next.js App Router standard)
        const supabase = await createServerClient();
        let user = null;

        const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser();

        if (cookieUser && !cookieError) {
            user = cookieUser;
            console.log('[Living Backgrounds] Auth via cookies successful');
        } else {
            // 2. Fallback to Authorization header
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
                    console.log('[Living Backgrounds] Auth via header successful');
                }
            }
        }

        if (!user) {
            console.error('[Living Backgrounds] Authentication failed');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use admin client for database operations
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        const body = await request.json();
        const { imageUrl, maskUrl, prompt, duration = 5, contextImages = [] } = body;

        // Validate inputs
        if (!imageUrl || !maskUrl || !prompt) {
            return NextResponse.json({
                error: 'Missing required fields: imageUrl, maskUrl, prompt'
            }, { status: 400 });
        }

        // Get user profile and check credits
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();

        const creditCost = duration === 10 ? 55 : 30;

        if (!profile || profile.credits < creditCost) {
            return NextResponse.json({
                error: 'Insufficient credits',
                required: creditCost,
                available: profile?.credits || 0
            }, { status: 402 });
        }

        // Call Wavespeed API using the centralized client
        // We map to 'kwaivgi/kling-video-o1/video-edit' which supports masking (Living Backgrounds use case)

        // Ensure imageUrl is a public URL, upload if base64
        let finalImageUrl = imageUrl;
        if (imageUrl && imageUrl.startsWith('data:')) {
            try {
                console.log('[Living Backgrounds] Uploading base64 image to Storage...');
                const base64Data = imageUrl.split('base64,')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                const fileName = `living-bg/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

                const { error: uploadError } = await adminSupabase.storage
                    .from('videos')
                    .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

                if (!uploadError) {
                    const { data: { publicUrl } } = adminSupabase.storage
                        .from('videos')
                        .getPublicUrl(fileName);
                    finalImageUrl = publicUrl;
                    console.log('[Living Backgrounds] Image uploaded:', finalImageUrl);
                }
            } catch (e) {
                console.error('[Living Backgrounds] Upload failed:', e);
            }
        }

        const enhancedPrompt = `Generate a video from this reference image, animating ONLY the background elements indicated by the mask while keeping the main subject/product completely still and sharp. The background movement should be: ${prompt}. Maintain crisp focus on the static subject with natural, subtle background animation at ${duration} seconds.`;

        console.log('[Living Backgrounds] Calling WavespeedClient...');

        let result;
        try {
            result = await wavespeedClient.generateVideo({
                prompt: enhancedPrompt,
                image_url: finalImageUrl,
                target_mask: maskUrl,
                model: 'kwaivgi/kling-v1.6-i2v-standard',
                duration: duration,
                aspect_ratio: '16:9'
            });
        } catch (error: any) {
            console.error('[Living Backgrounds] WavespeedClient Error:', error);
            return NextResponse.json({
                error: 'Video generation failed',
                details: error.message || error
            }, { status: 500 });
        }

        const taskId = result.taskId;

        // Deduct credits
        await adminSupabase
            .from('profiles')
            .update({ credits: profile.credits - creditCost })
            .eq('id', user.id);

        // Store generation task
        const { data: task, error: taskError } = await adminSupabase
            .from('magic_video_tasks')
            .insert({
                user_id: user.id,
                task_id: taskId,
                type: 'living-backgrounds',
                status: 'processing',
                input_data: {
                    imageUrl,
                    maskUrl,
                    prompt,
                    duration,
                    contextImages
                },
                credits_cost: creditCost
            })
            .select()
            .single();

        if (taskError) {
            console.error('Failed to store task:', taskError);
        }

        return NextResponse.json({
            success: true,
            taskId: taskId,
            status: 'processing',
            estimatedTime: 120,
            creditsDeducted: creditCost
        });

    } catch (error: any) {
        console.error('Living Backgrounds API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            message: error.message
        }, { status: 500 });
    }
}
