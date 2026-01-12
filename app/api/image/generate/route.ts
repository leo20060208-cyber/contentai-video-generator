import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createReplicatePrediction, getReplicatePredictionStatus, ReplicateModel } from '@/lib/replicate';
import { checkCredits, deductCredits, CREDIT_COSTS } from '@/lib/db/credits';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        console.log('[API] Image generation request received');

        // 1. Auth & Credits Check
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const authHeader = request.headers.get('authorization');
        let userId: string | null = null;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) userId = user.id;
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const COST = CREDIT_COSTS.IMAGE_GENERATION;
        const hasCredits = await checkCredits(userId, COST);
        if (!hasCredits) {
            console.warn(`[API] User ${userId} has insufficient credits for image gen.`);
            return NextResponse.json({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }, { status: 402 });
        }

        const body = await request.json();
        const { prompt, model, image } = body;

        if (!prompt && !image) {
            return NextResponse.json({ error: 'Prompt or Image is required' }, { status: 400 });
        }

        const selectedModel = model || 'flux-schnell';
        console.log(`[API] Generating image with ${selectedModel} for user ${userId}`);

        // 2. Deduct Credits BEFORE generation (to prevent abuse)
        // Ideally we would refund if it fails, but for now strict deduction
        const deducted = await deductCredits(userId, COST, `Image Generation (${selectedModel})`);
        if (!deducted) {
            return NextResponse.json({ error: 'Failed to process credits' }, { status: 500 });
        }

        // 3. Create prediction
        try {
            const prediction = await createReplicatePrediction({
                model: selectedModel as ReplicateModel,
                prompt: prompt,
                image: image, // Pass image for img2img
                aspect_ratio: "16:9" // Default to 16:9 for video base
            });

            console.log(`[API] Image prediction created: ${prediction.id}`);

            // Poll for completion (short duration for Schnell ~1-2s)
            let status = 'processing';
            let output = null;
            let attempts = 0;

            while (status === 'processing' || status === 'starting') {
                if (attempts > 30) throw new Error('Timeout generating image');

                await new Promise(resolve => setTimeout(resolve, 1000));
                const check = await getReplicatePredictionStatus(prediction.id);
                status = check.status;

                if (status === 'succeeded') {
                    output = check.output;
                } else if (status === 'failed' || status === 'canceled') {
                    throw new Error(String(check.error) || 'Image generation failed');
                }
                attempts++;
            }

            // Flux Schnell usually returns an array of URLs (or single URL depending on config)
            // Usually [ "url" ]
            const imageUrl = Array.isArray(output) ? output[0] : output;

            console.log('[API] Image generation successful:', imageUrl);

            return NextResponse.json({
                imageUrl: imageUrl
            });

        } catch (genError) {
            // Rollback credits on failure?
            // Not implemented yet to avoid complexity, but logged.
            console.error('[API] Image Generation Failed but credits deducted:', genError);
            throw genError;
        }

    } catch (error) {
        console.error('[API] Image Gen Error:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Failed to generate image' },
            { status: 500 }
        );
    }
}
