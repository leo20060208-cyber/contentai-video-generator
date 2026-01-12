import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.warn('[Analyze] GEMINI_API_KEY not configured');
            return NextResponse.json({
                description: 'Unable to analyze image - API not configured',
                detectedItems: [],
                style: '',
                suggestions: []
            });
        }

        // Fetch image and convert to base64
        let imageBase64: string;
        let mimeType: string = 'image/jpeg';

        if (imageUrl.startsWith('data:')) {
            // Already base64
            const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                imageBase64 = matches[2];
            } else {
                throw new Error('Invalid base64 image format');
            }
        } else {
            // Fetch from URL
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();
            imageBase64 = Buffer.from(imageBuffer).toString('base64');
            mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Analyze this image for a product photography recreation. Provide a JSON response with:

1. "description": A concise description of the scene (what's happening, who/what is in it)
2. "detectedItems": Array of items that could be substituted/replaced, each with:
   - "name": Item name (e.g., "black leather jacket", "blue jeans", "sneakers")
   - "location": Where it is (e.g., "worn by the person", "on the table", "in the background")
   - "type": Category (clothing, accessory, product, background, object)
3. "style": Brief description of the photography style (lighting, mood, colors)
4. "suggestions": Array of 2-3 suggested substitution instructions the user might want (e.g., "Replace the jacket with your product", "Change the background to a studio setting")

ONLY respond with valid JSON, no markdown or extra text. Example:
{
  "description": "A person wearing casual streetwear standing in an urban setting",
  "detectedItems": [
    {"name": "black bomber jacket", "location": "worn by the person", "type": "clothing"},
    {"name": "blue denim jeans", "location": "worn by the person", "type": "clothing"},
    {"name": "white sneakers", "location": "on the person's feet", "type": "clothing"}
  ],
  "style": "Street photography, natural daylight, urban aesthetic",
  "suggestions": [
    "Replace the bomber jacket with your product jacket",
    "Swap the sneakers for your footwear product",
    "Keep the urban background but change the outfit colors"
  ]
}`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: imageBase64
                }
            }
        ]);

        const responseText = result.response.text();
        console.log('[Analyze] Gemini response:', responseText.substring(0, 200));

        // Parse JSON from response
        let analysis;
        try {
            // Try to extract JSON from the response (handle markdown code blocks)
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                [null, responseText];
            const jsonStr = jsonMatch[1] || responseText;
            analysis = JSON.parse(jsonStr.trim());
        } catch (parseError) {
            console.error('[Analyze] Failed to parse JSON:', parseError);
            // Return a basic structure if parsing fails
            analysis = {
                description: responseText.substring(0, 200),
                detectedItems: [],
                style: '',
                suggestions: ['Describe what product should replace what item in the image']
            };
        }

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error('[Analyze] Error:', error);
        return NextResponse.json({
            error: 'Failed to analyze image',
            description: 'Could not analyze the image. Please describe the substitutions manually.',
            detectedItems: [],
            style: '',
            suggestions: []
        }, { status: 500 });
    }
}
