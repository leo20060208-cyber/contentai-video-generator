import { NextResponse } from 'next/server';
import { WavespeedClient } from '@/lib/wavespeed';

export const runtime = 'nodejs';

// Initialize client
const wavespeedClient = new WavespeedClient();

export async function POST(request: Request) {
    try {
        console.log('[API] Image Refinement request received');

        // Check API Key
        if (!process.env.WAVESPEED_API_KEY) {
            return NextResponse.json({ error: 'WAVESPEED_API_KEY missing' }, { status: 500 });
        }

        const body = await request.json();
        const { images, prompt } = body;

        // Validation
        if (!images || !Array.isArray(images) || images.length === 0) {
            return NextResponse.json({ error: 'Images array is required' }, { status: 400 });
        }
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        console.log(`[API Refine] Processing ${images.length} images with Nano Banana...`);
        console.log(`[API Refine] Prompt: ${prompt.substring(0, 50)}...`);

        // Call Wavespeed (Nano Banana)
        const result = await wavespeedClient.editImage({
            images: images,
            prompt: prompt,
            model: 'google/nano-banana/edit'
        });

        if (result.url) {
            console.log(`[API Refine] Success! URL: ${result.url}`);
            return NextResponse.json({ url: result.url, status: 'completed' });
        } else if (result.taskId) {
            console.log(`[API Refine] Queued. TaskId: ${result.taskId}`);
            // If async, frontend needs to handle polling or we just fail gracefuly for now as we prefer sync
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
