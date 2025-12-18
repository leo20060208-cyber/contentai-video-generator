import { NextResponse } from 'next/server';
import { createReplicatePrediction, getReplicatePredictionStatus } from '@/lib/replicate';

export const runtime = 'nodejs'; // or 'edge'

export async function POST(request: Request) {
    try {
        const { imageUrl, prompt } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        console.log('[Describe API] Starting description for:', imageUrl);

        // 1. Start Prediction
        const prediction = await createReplicatePrediction({
            model: 'llava',
            image: imageUrl,
            prompt: prompt || "Describe the style, lighting, and movement in this scene in detail. Focus on the cinematography and the main subject."
        });

        // 2. Poll for result (Simple server-side polling for convenience)
        let result = prediction;
        const maxAttempts = 30; // 30 * 1s = 30s max
        let attempts = 0;

        while (result.status !== 'succeeded' && result.status !== 'failed' && result.status !== 'canceled' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            result = await getReplicatePredictionStatus(result.id);
            attempts++;
        }

        if (result.status === 'succeeded') {
            // LLaVA returns an array of text usually, or a string
            const description = Array.isArray(result.output) ? result.output.join('') : result.output;
            return NextResponse.json({ description });
        } else if (result.status === 'failed') {
            return NextResponse.json({ error: 'AI processing failed' }, { status: 500 });
        } else {
            // Timed out server-side, return ID for client to continue polling if needed
            // But for now, just return what we have or error
            return NextResponse.json({ error: 'Description timed out' }, { status: 504 });
        }

    } catch (error: any) {
        console.error('[Describe API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
