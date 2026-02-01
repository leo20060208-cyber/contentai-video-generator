import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { WavespeedClient } from '@/lib/wavespeed';
import { deductCredits } from '@/lib/credits';

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
    const wavespeedClient = new WavespeedClient();
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

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        const body = await request.json();
        const {
            startVideo,
            endImage,
            prompt,
            duration = 5,
            quality = 'normal',
            aspectRatio = '16:9',
            characterOrientation = 'video'
        } = body;

        if (!startVideo || !prompt) {
            return NextResponse.json({
                error: 'Missing required fields: startVideo, prompt'
            }, { status: 400 });
        }

        // Credit Calculation
        const durationToCharge = Math.ceil(duration) || 5;
        const multiplier = quality === 'pro' ? 8 : 4;
        const creditCost = durationToCharge * multiplier;

        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();

        if (!profile || profile.credits < creditCost) {
            return NextResponse.json({
                error: 'Insufficient credits',
                required: creditCost,
                available: profile?.credits || 0
            }, { status: 402 });
        }

        // Select model
        const model = quality === 'pro'
            ? 'kwaivgi/kling-v2.6-pro/motion-control'
            : 'kwaivgi/kling-v2.6-std/motion-control';

        // Prepare Wavespeed Payload
        const apiPayload = {
            video: startVideo,
            image: endImage || undefined,
            prompt: prompt,
            duration: durationToCharge,
            aspect_ratio: aspectRatio,
            frames_per_second: 24,
            cfg_scale: 8.0,
            character_orientation: characterOrientation
        };

        // Call Wavespeed API
        const result = await wavespeedClient.generateVideo({
            model: model,
            prompt: prompt,
            customPayload: apiPayload
        });

        // Deduct credits
        await deductCredits(adminSupabase, user.id, creditCost, `Magic Video: Motion Control (${quality})`);

        // Store generation task
        const { data: task, error: taskError } = await adminSupabase
            .from('magic_video_tasks')
            .insert({
                user_id: user.id,
                task_id: result.taskId,
                type: 'motion-control',
                status: 'processing',
                input_data: {
                    startVideo,
                    endImage,
                    prompt,
                    duration,
                    quality,
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
            taskId: result.taskId,
            status: result.status,
            estimatedTime: 180,
            creditsDeducted: creditCost
        });

    } catch (error: any) {
        console.error('Motion Control API error:', error);
        return NextResponse.json({
            error: `Generation failed: ${error.message}`
        }, { status: 500 });
    }
}
