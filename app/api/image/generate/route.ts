import { NextResponse } from 'next/server';
import { createReplicatePrediction, getReplicatePredictionStatus, ReplicateModel } from '@/lib/replicate';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        console.log('[API] Image generation request received');
        const body = await request.json();
        const { prompt, model, image } = body;

        if (!prompt && !image) {
            return NextResponse.json({ error: 'Prompt or Image is required' }, { status: 400 });
        }

        const selectedModel = model || 'flux-schnell';
        console.log(`[API] Generating image with ${selectedModel}`);

        // Create prediction
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

    } catch (error) {
        console.error('[API] Image Gen Error:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Failed to generate image' },
            { status: 500 }
        );
    }
}
