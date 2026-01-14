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
        const {
            startImage,
            endImage,
            midImages = [],
            prompt,
            duration = 5,
            aspectRatio = '16:9'
        } = body;

        // Validate inputs
        if (!startImage || !endImage || !prompt) {
            return NextResponse.json({
                error: 'Missing required fields: startImage, endImage, prompt'
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

        // Prepare API payload
        let apiInput: any;

        // Enhanced autoprompt for realistic video generation
        // Enhanced autoprompt for realistic video generation based on user request (Final Polish)
        const baseAutoPrompt = `Create a high-quality, photorealistic video that seamlessly transitions through the provided keyframes in strict chronological order: Start Frame → Middle Frame(s) → End Frame.

User Description: "${prompt}"

Visual Style & Quality Guidelines:
- **Cinematic Lighting**: Use professional lighting (volumetric, studio, or natural cinematic matching the scene) to enhance depth and realism.
- **Photorealism**: Textures, skin tones, and materials must be indistinguishable from reality. 8k resolution, razor-sharp detail.
- **Motion**: Fluid, natural movement with no morphing artifacts. Physics should be realistic.
- **Composition**: Maintain the aesthetic quality of the input frames, unifying them into a cohesive narrative sequence.

Technical Requirement: The video MUST start exactly with the Start Frame, pass through any Middle Frames, and conclude with the End Frame, filling the ${duration}s duration with smooth, logical motion.`;

        if (midImages.length > 0) {
            // Multiple keyframes
            apiInput = {
                keyframes: [
                    { image: startImage, time: 0.0 },
                    ...midImages.map((img: string, i: number) => ({
                        image: img,
                        time: (i + 1) / (midImages.length + 1)
                    })),
                    { image: endImage, time: 1.0 }
                ],
                prompt: baseAutoPrompt,
                negative_prompt: 'abrupt cuts, flickering, distortion, artifacts, unnatural motion, low quality, choppy animation',
                duration: duration,
                aspect_ratio: aspectRatio,
                cfg_scale: 8.0
            };
        } else {
            // Simple start-to-end transition
            apiInput = {
                image: startImage,
                end_image: endImage,
                prompt: baseAutoPrompt,
                negative_prompt: 'abrupt cuts, flickering, distortion, artifacts, unnatural motion, low quality, choppy animation',
                duration: duration,
                aspect_ratio: aspectRatio,
                cfg_scale: 8.0,
                frames_per_second: 24,
                seed: -1
            };
        }

        // Call Wavespeed Sora-2 API
        const wavespeedResponse = await fetch('https://api.wavespeed.ai/v1/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WAVESPEED_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/sora-2/image-to-video',
                input: apiInput
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
                type: 'directors-cut',
                status: 'processing',
                input_data: {
                    startImage,
                    endImage,
                    midImages,
                    prompt,
                    duration,
                    aspectRatio
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
            estimatedTime: wavespeedData.estimated_time || 180,
            creditsDeducted: creditCost
        });

    } catch (error: any) {
        console.error('Directors Cut API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            message: error.message
        }, { status: 500 });
    }
}
