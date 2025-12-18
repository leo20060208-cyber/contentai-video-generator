import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(req: NextRequest) {
    try {
        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        console.log('Removing background from:', imageUrl);

        // Use RMBG-1.4 model for background removal
        const output = await replicate.run(
            "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
            {
                input: {
                    image: imageUrl
                }
            }
        );

        // Output is a URL string
        const resultUrl = typeof output === 'string' ? output : (output as any)?.toString(); // eslint-disable-line @typescript-eslint/no-explicit-any

        console.log('Background removed successfully:', resultUrl);

        return NextResponse.json({
            success: true,
            imageUrl: resultUrl
        });

    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error('Error removing background:', error);
        return NextResponse.json({
            error: 'Failed to remove background',
            details: error.message
        }, { status: 500 });
    }
}
