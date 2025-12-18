import { NextResponse } from 'next/server';
import { FalClient } from '@/lib/fal';

const fal = new FalClient(process.env.FAL_KEY || '');

export async function POST(req: Request) {
    try {
        const { videoUrl, points, maskIndex } = await req.json();

        if (!videoUrl || !points) {
            return NextResponse.json({ error: 'Missing videoUrl or points' }, { status: 400 });
        }

        console.log('🔥 [API] STARTING VIDEO SEGMENTATION:', videoUrl, 'Mask Index:', maskIndex);

        const result = await fal.segmentVideo({
            video_url: videoUrl,
            points,
            mask_index: maskIndex || 0
        });

        console.log('✅ [API] VIDEO SEGMENTATION COMPLETE:', result);

        // The result structure from Fal depends on the specific app "fast-sam-2" usually returns { mask_video_url: ... }
        // We ensure we pass it back
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[API] Segment Video Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
