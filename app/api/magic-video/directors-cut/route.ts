import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { WavespeedClient } from '@/lib/wavespeed';

export async function POST(request: NextRequest) {
    const wavespeedClient = new WavespeedClient();
    try {
        // === HYBRID AUTH STRATEGY ===
        // 1. Try cookie-based auth first (Next.js App Router standard)
        const supabase = await createServerClient();
        let user = null;

        const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser();

        if (cookieUser && !cookieError) {
            user = cookieUser;
            console.log('[Directors Cut] Auth via cookies successful');
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
                    console.log('[Directors Cut] Auth via header successful');
                }
            }
        }

        if (!user) {
            console.error('[Directors Cut] Authentication failed');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use admin client for database operations
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

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
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();

        // Map duration to allowed model values [4, 8]
        // User selects 5s -> Model uses 4s
        // User selects 10s -> Model uses 8s
        const mappedDuration = duration <= 5 ? 4 : 8;
        const creditCost = duration >= 10 ? 55 : 30;

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
                duration: mappedDuration,
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
                duration: mappedDuration,
                aspect_ratio: aspectRatio,
                cfg_scale: 8.0,
                frames_per_second: 24,
                seed: -1
            };
        }

        // Call Wavespeed Sora-2 API via Client
        // We pass the prompt merely for logging, but the real work is in customPayload.
        // Assuming V3 API uses flat structure for parameters like other models.

        const result = await wavespeedClient.generateVideo({
            model: 'openai/sora-2/image-to-video',
            prompt: prompt,
            customPayload: {
                // V3 API typically accepts flat parameters for the model
                ...apiInput
            }
        });

        // The client throws error if failed, so if we are here, it worked.
        // Normalize response data structure
        const wavespeedData = {
            task_id: result.taskId,
            status: result.status,
            estimated_time: 180
        };

        // Deduct credits
        const { deductCredits } = await import('@/lib/credits');
        await deductCredits(adminSupabase, user.id, creditCost, `Magic Video: Directors Cut (${duration}s)`);

        // Store generation task
        const { data: task, error: taskError } = await adminSupabase
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
            error: `Generation failed: ${error.message}`,
            details: error.message
        }, { status: 500 });
    }
}
