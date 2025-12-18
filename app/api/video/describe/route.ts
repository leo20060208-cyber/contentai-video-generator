
import { NextResponse } from 'next/server';
import { generateImageDescription } from '@/lib/replicate';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageUrl } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        console.log('Generating description for image:', imageUrl);

        const description = await generateImageDescription(imageUrl);

        return NextResponse.json({ description });
    } catch (error) {
        console.error('Error generating description:', error);
        return NextResponse.json({
            error: (error as Error).message || 'Failed to generate description'
        }, { status: 500 });
    }
}
