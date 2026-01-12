// ... imports ...
import { NextResponse } from 'next/server';
import { WavespeedClient } from '@/lib/wavespeed';
import { createClient } from '@supabase/supabase-js';
import { checkCredits, deductCredits, CREDIT_COSTS } from '@/lib/db/credits';

export const runtime = 'nodejs';

// Initialize client
const wavespeedClient = new WavespeedClient();

export async function POST(request: Request) {
    try {
        console.log('[API] Image Refinement request received');

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

        const body = await request.json();
        const { images, prompt, dimensions, tier } = body;

        // Validation
        if (!images || !Array.isArray(images) || images.length === 0) {
            return NextResponse.json({ error: 'Images array is required' }, { status: 400 });
        }
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Determine Cost and Model based on Tier
        // Default to Normal if not specified
        const isPro = tier === 'pro';
        const REQUIRED_COST = isPro ? CREDIT_COSTS.IMAGE_GENERATION_PRO : CREDIT_COSTS.IMAGE_GENERATION;

        // Model selection
        // Pro: NaoBanana Pro (google/nano-banana-pro/edit)
        // Normal: NanoBanana (google/nano-banana/edit)
        const selectedModel = isPro ? 'google/nano-banana-pro/edit' : 'google/nano-banana/edit';

        const hasCredits = await checkCredits(userId, REQUIRED_COST);
        if (!hasCredits) {
            console.warn(`[API] User ${userId} has insufficient credits for refine (Need ${REQUIRED_COST}).`);
            return NextResponse.json({ error: `Insufficient credits. Need ${REQUIRED_COST} credits.`, code: 'INSUFFICIENT_CREDITS' }, { status: 402 });
        }

        console.log(`[API Refine] Processing ${images.length} images with ${selectedModel} (Tier: ${tier || 'normal'}, Cost: ${REQUIRED_COST})...`);

        // === DETAILED API LOG ===
        console.log('');
        console.log('╔═══════════════════════════════════════╗');
        console.log('║   API IMAGE REFINE - RECEIVED         ║');
        console.log('╠═══════════════════════════════════════╣');
        console.log('║ Images rebudes:', images.length.toString().padEnd(24), '║');
        images.forEach((img, i) => {
            const type = img.startsWith('data:') ? 'base64' : (img.startsWith('http') ? 'URL' : '???');
            const size = `${(img.length / 1024).toFixed(0)}KB`;
            console.log(`║  [${i}] ${type}:`.padEnd(15), size.padEnd(24), '║');
        });
        console.log('║ Model:', (selectedModel || '').padEnd(32), '║');
        console.log('║ Cost:', `${REQUIRED_COST} crèdits`.padEnd(34), '║');
        console.log('╚═══════════════════════════════════════╝');
        console.log('');

        // 2. Deduct Credits
        const deducted = await deductCredits(userId, REQUIRED_COST, `Image Refine/Gen (${tier === 'pro' ? 'Pro' : 'Normal'})`);
        if (!deducted) {
            return NextResponse.json({ error: 'Failed to process credits' }, { status: 500 });
        }

        // Call Wavespeed (Nano Banana)
        const result = await wavespeedClient.editImage({
            images: images,
            prompt: prompt,
            model: selectedModel,
            width: dimensions?.width,
            height: dimensions?.height
        });

        if (result.url) {
            console.log(`[API Refine] Success! URL: ${result.url}`);
            return NextResponse.json({ url: result.url, status: 'completed' });
        } else if (result.taskId) {
            console.log(`[API Refine] Queued. TaskId: ${result.taskId}`);
            return NextResponse.json({ taskId: result.taskId, status: 'processing' });
        } else {
            throw new Error('No URL or TaskID returned from Wavespeed');
        }

    } catch (error: any) {
        console.error('[API Refine] Error:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
