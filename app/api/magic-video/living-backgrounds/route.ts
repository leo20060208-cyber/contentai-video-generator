import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { imageUrl, maskUrl, prompt, duration = 5, contextImages = [] } = body;

        // Validate inputs
        if (!imageUrl || !maskUrl || !prompt) {
            return NextResponse.json({
                error: 'Missing required fields: imageUrl, maskUrl, prompt'
            }, { status: 400 });
        }

        // Get user profile and check credits
        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();

        const creditCost = duration === 10 ? 50 : 30;

        if (!profile || profile.credits < creditCost) {
            return NextResponse.json({
                error: 'Insufficient credits',
                required: creditCost,
                available: profile?.credits || 0
            }, { status: 402 });
        }

        // Call Wavespeed Sora-2 API
        const enhancedPrompt = `Generate a video from this reference image, animating ONLY the background elements indicated by the mask while keeping the main subject/product completely still and sharp. The background movement should be: ${prompt}. Maintain crisp focus on the static subject with natural, subtle background animation at ${duration} seconds.`;

        const wavespeedResponse = await fetch('https://api.wavespeed.ai/v1/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WAVESPEED_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/sora-2/image-to-video',
                input: {
                    image: imageUrl,
                    mask: maskUrl,
                    prompt: enhancedPrompt,
                    negative_prompt: 'subject movement, object deformation, character motion, product moving, blurry subject, distorted features',
                    duration: duration,
                    aspect_ratio: '16:9',
                    cfg_scale: 8.0,
                    seed: -1
                }
            })
        });

        if (!wavespeedResponse.ok) {
            const errorData = await wavespeedResponse.json().catch(() => ({}));
            console.error('Wavespeed API error:', errorData);
            return NextResponse.json({
                error: 'Video generation failed',
                details: errorData
            }, { status: 500 });
        }

        const wavespeedData = await wavespeedResponse.json();

        // Deduct credits
        await supabase
            .from('profiles')
            .update({ credits: profile.credits - creditCost })
            .eq('id', user.id);

        // Store generation task
        const { data: task, error: taskError } = await supabase
            .from('magic_video_tasks')
            .insert({
                user_id: user.id,
                task_id: wavespeedData.task_id,
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
            taskId: wavespeedData.task_id,
            status: wavespeedData.status,
            estimatedTime: wavespeedData.estimated_time || 120,
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
