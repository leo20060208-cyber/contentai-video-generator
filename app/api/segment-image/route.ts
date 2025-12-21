import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

// Helper to get Replicate client (lazy initialization to avoid build-time errors)
function getReplicateClient() {
    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error('Missing REPLICATE_API_TOKEN');
    }
    return new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
    });
}

export async function POST(req: NextRequest) {
    try {
        if (!process.env.REPLICATE_API_TOKEN) {
            console.error('Missing REPLICATE_API_TOKEN');
            return NextResponse.json({ error: 'Server misconfiguration: Missing API Token' }, { status: 500 });
        }
        
        const replicate = getReplicateClient();

        // Support both single point (legacy) and points array
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('Error parsing request body:', e);
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
        const { imageUrl } = body;

        // Normalize input to array of points
        let points = body.points;
        if (!points && body.point) {
            points = [body.point];
        }

        let input: any = {
            image: imageUrl,
            multimask_output: true // Get all 3 mask levels (Ambiguity resolution)
        };

        // If image is a data URI, convert to Buffer to allow Replicate SDK to upload it
        // This avoids 422 errors with strict URI validation or large payloads
        if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
            const base64Data = imageUrl.split(',')[1];
            input.image = Buffer.from(base64Data, 'base64');
        }

        if (body.box) {
            const b = body.box;
            input.box = JSON.stringify(b);
        } else {
            if (!points || points.length === 0) {
                return NextResponse.json({ error: 'Points or Box required' }, { status: 400 });
            }

            // Format for SAM 2:
            const pointCoords = points.map((p: any) => [Number(p.x), Number(p.y)]);
            const pointLabels = points.map((p: any) => (p.label !== undefined ? Number(p.label) : 1));

            // CRITICAL FIX: Do not JSON.stringify these fields when using Node SDK.
            input.point_coords = pointCoords;
            input.point_labels = pointLabels;
        }

        console.log('Sending to SAM 2:', JSON.stringify({
            ...input,
            image: input.image ? '(Buffer)' : undefined
        }));

        // Use SAM 2 (Fastest & SOTA)
        const output = await replicate.run(
            "lucataco/segment-anything-2:be7cbde9fdf0eecdc8b20ffec9dd0d1cfeace0832d4d0b58a071d993182e1be0",
            { input }
        );

        console.log('Replicate Raw Output (Server):', output);

        // Robust Handling: Replicate SDK might return FileOutput objects which act like Promises/Streams
        // We need to extract the URL.
        let cleanResult = output;

        if (Array.isArray(output)) {
            // Map array of items to strings
            cleanResult = output.map((item: any) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                    // Method 1: FileOutput with .url() method (The user log case: "url() { return new URL(url); }")
                    if (typeof item.url === 'function') {
                        try { return item.url().toString(); } catch (e) { return null; }
                    }
                    // Method 2: Standard property
                    if (item.url && typeof item.url === 'string') return item.url;

                    // Method 3: Href property
                    if (item.href) return item.href.toString();

                    // Method 4: Cast to string (often works for FileOutput to get URL)
                    const str = item.toString();
                    if (str !== '[object Object]' && str.startsWith('http')) return str;

                    return null;
                }
                return item;
            }).filter(Boolean); // Remove nulls
        } else if (typeof output === 'object' && output !== null) {
            // Handle single return
            const item = output as any;
            if (typeof item.url === 'function') cleanResult = item.url().toString();
            else if (item.url) cleanResult = item.url.toString();
            else cleanResult = item.toString();
        }

        console.log('Cleaned Result:', cleanResult);

        return NextResponse.json({
            success: true,
            result: cleanResult,
            boxed_mask: Array.isArray(cleanResult) && cleanResult.length > 0 ? cleanResult[0] : cleanResult
        });

    } catch (error: any) {
        console.error('SERVER ERROR segmenting image:', error);

        let details = error.message;
        if (error.response) {
            // Replicate API error details often in error.response.data
            try {
                const data = await error.response.json(); // Accessing response body if exists
                details = JSON.stringify(data);
            } catch (ignored) { }
        }

        return NextResponse.json({
            error: 'Failed to segment image',
            details: details
        }, { status: 500 });
    }
}
