
import { NextRequest, NextResponse } from 'next/server';
import { VertexAI, Part } from '@google-cloud/vertexai';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        console.log('[PromptGenius] Starting analysis...');

        const formData = await req.formData();
        const videoFile = formData.get('video') as File;
        const context = formData.get('context') as string || ''; // E.g., "A bottle of perfume"

        if (!videoFile) {
            return NextResponse.json({ error: 'No video provided' }, { status: 400 });
        }

        // 1. Upload/Process Video for Gemini
        // Convert File to Base64 (Gemini API supports direct inline data for smaller videos, 
        // or File API for larger. For this Admin tool, we'll try inline first roughly limited to < 20MB in standard configs,
        // but robust implementation should use the File Manager API. For speed/MVP: Inline).

        const arrayBuffer = await videoFile.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        // Vertex AI Part structure
        const filePart = {
            inlineData: {
                data: base64Data,
                mimeType: videoFile.type || 'video/mp4',
            },
        };

        // 2. The Logic: "Swap Object A for Object B using a Mask"
        const projectId = process.env.GOOGLE_PROJECT_ID || 'circular-hash-480519-e4';
        const location = 'europe-southwest1'; // Hardcoding to match the other route app/api/prompt/generate/route.ts
        const credentialsPath = path.join(process.cwd(), 'service-account.json');

        console.log(`[PromptGenius] Vertex Config - Project: ${projectId}, Location: ${location}`);

        // Temporarily set env var for authentication if not global
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

        const vertexAI = new VertexAI({ project: projectId, location });
        // Attempting to use the model specified in the other route, although likely a customized alias or placeholder
        const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        const prompt = `
        I am creating a Video Template for an AI Inpainting/Replacement SaaS.
        
        Detailed Goal:
        The goal is to take the video provided and recreate it frame - by - frame, pixel - perfect, BUT replacing the object inside the masked area with a USER'S PRODUCT (placeholder: [THE PRODUCT]).
        
        CRITICAL RULES:
        1. NO AUDIO.Do not mention sound, music, or voiceovers.Focus 100 % on visuals.
        2. PHYSICS & MOTION MATCHING: The new object[THE PRODUCT] must move, rotate, and interact with light EXACTLY like the original object.
        3. TIMELINE PRECISION: You MUST specific exactly WHEN actions happen(e.g. "At 00:02, the product rotates...").
        4. COLOR & LIGHTING: The lighting environment(shadows, reflections, hue) must remain identical to the original video.
        
        I need you to generate TWO things:

        1. "THE SKELETON PROMPT"(Template Prompt):
        - A descriptive prompt where the main object is replaced by the placeholder "[THE PRODUCT]".
           - It must strictly describe the ACTIONS and PHYSICS of the object using timestamps.
        - Example: "A [THE PRODUCT] sits on a table. At 00:02 it rotates slowly to the left. The scene is bathed in warm soft light."

        2. "THE TECHNICAL ANALYSIS":
        - A concise list of the camera angle, lighting setup, and movement type.
           - EXACT DURATION: State the full duration of the video event described.
        
        Output valid JSON only:
        {
            "skeleton_prompt": "String...",
                "technical_analysis": "String...",
                    "detected_object_action": "How the object moves (e.g. spins, falls, sits still)",
                        "video_duration_seconds": "Approximate duration of the action"
        }
        `;

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    filePart
                ]
            }]
        });
        const response = await result.response;

        // Vertex AI returns candidates array
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No text generated from Vertex AI');
        }

        // Clean JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (!jsonData) {
            throw new Error('Failed to parse AI response');
        }

        return NextResponse.json({ success: true, data: jsonData });

    } catch (error: any) {
        console.error('[PromptGenius] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
