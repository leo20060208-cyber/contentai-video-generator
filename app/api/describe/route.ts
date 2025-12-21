import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Helper to get Replicate client (lazy initialization to avoid build-time errors)
function getReplicateClient() {
    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error('Missing REPLICATE_API_TOKEN');
    }
    return new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
    });
}

export async function POST(request: Request) {
    try {
        const replicate = getReplicateClient();
        const { image } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        console.log('[API] Describing image via Vision Model...');

        // Use LLaVa or similar for description. 
        // Using "yorickvp/llava-13b:b5f6212d032508382d61ff00469dd1d608d34f25332e5513641a287c3942003c"
        // Prompt: Describe the background and environment of this image in detail.

        const output = await replicate.run(
            "yorickvp/llava-13b:b5f6212d032508382d61ff00469dd1d608d34f25332e5513641a287c3942003c",
            {
                input: {
                    image: image,
                    prompt: "Describe the background, lighting, and environment of this image in detail. Ignore the specific central object if it looks like a product/person, just describe the scene context.",
                    max_tokens: 100
                }
            }
        );

        // Output is usually an array of strings
        const description = Array.isArray(output) ? output.join('') : output;

        console.log('[API] Description:', description);

        return NextResponse.json({ description });

    } catch (error) {
        console.error('[API] Describe Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
