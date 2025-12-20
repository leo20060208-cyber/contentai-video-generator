import { NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const videoFile = formData.get('video') as File | null;
        const saveToDatabase = formData.get('saveToDatabase') === 'true';
        const videoTitle = formData.get('videoTitle') as string | null;

        if (!videoFile) {
            return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
        }

        const projectId = process.env.GOOGLE_PROJECT_ID || 'circular-hash-480519-e4';
        const location = process.env.GOOGLE_LOCATION || 'europe-southwest1';

        // Set credentials path
        const credentialsPath = path.join(process.cwd(), 'service-account.json');
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

        console.log('Using credentials from:', credentialsPath);
        console.log('Project ID:', projectId);
        console.log('Location:', location);
        console.log('Video file size:', videoFile.size, 'bytes');
        console.log('Video type:', videoFile.type);

        // Initialize Vertex AI
        const vertexAI = new VertexAI({ project: projectId, location: location });

        // Use Gemini 2.5 Pro with extended thinking for better analysis
        const model = vertexAI.getGenerativeModel({
            model: 'gemini-2.5-pro',
            generationConfig: {
                temperature: 0.2, // Lower temperature for more precise analysis
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192, // Allow longer responses
            }
        });

        const buffer = Buffer.from(await videoFile.arrayBuffer());

        // Enhanced prompt with frame-by-frame analysis requirement
        const prompt = `You are a professional video analyst and cinematographer. Your task is to analyze this video with EXTREME PRECISION to generate a prompt that can recreate it EXACTLY using AI video generation (Veo 3.1).

## CRITICAL INSTRUCTIONS:
- Watch the ENTIRE video carefully, frame by frame
- Note EVERY visual detail, movement, transition
- Be EXTREMELY SPECIFIC - no vague descriptions
- Include EXACT timings for all events
- Describe what you SEE, not what you assume

## REQUIRED ANALYSIS (answer ALL sections):

### 1. VIDEO OVERVIEW
- Exact duration (in seconds, e.g., "8.5 seconds")
- Aspect ratio (16:9, 9:16, 1:1, etc.)
- Total number of distinct scenes/shots
- Overall style (cinematic, documentary, social media, etc.)

### 2. FRAME-BY-FRAME BREAKDOWN
For EACH second of the video, describe:
- 0:00-0:01: [What happens]
- 0:01-0:02: [What happens]
- (continue for entire duration)

### 3. SUBJECT/PERSON DESCRIPTION
If there are people:
- Gender, approximate age
- Skin tone
- Hair color, style, length
- Facial features (if visible)
- Clothing: exact colors, style, materials, patterns
- Accessories (jewelry, glasses, hats, etc.)
- Body position and pose
- Facial expression
- Actions performed

If objects/products:
- Exact type, brand if visible
- Colors with precision (not just "blue" but "deep navy blue")
- Material and texture
- Size relative to frame
- Position and angle

### 4. ENVIRONMENT/BACKGROUND
- Location type (indoor/outdoor, specific place)
- Architecture or nature elements
- Background colors and textures
- Depth (how far can you see)
- Any text, signs, logos visible
- Weather/lighting conditions if outdoor

### 5. CAMERA WORK
- Camera angle at start (low, eye-level, high, bird's eye)
- Camera angle at end (if changed)
- Movement type (static, pan, tilt, dolly, orbit, zoom)
- Movement speed (slow, medium, fast)
- Movement direction (left-to-right, up-to-down, etc.)
- Any camera shake (steady, slight, intentional)

### 6. LIGHTING ANALYSIS
- Primary light source and direction
- Light quality (hard/soft)
- Shadows (where, how dark, shape)
- Color temperature (warm/cool/neutral)
- Any color grading applied
- Highlights and dark areas

### 7. COLOR PALETTE
List the 5 most prominent colors with:
- Color name
- Approximate hex code
- Where it appears in frame

### 8. MOTION DYNAMICS
- Subject movement (walking, gesturing, static, etc.)
- Speed of movement
- Any slow motion or speed ramping
- Secondary motions (wind, particles, background movement)

### 9. TRANSITIONS & EFFECTS
- Any cuts or transitions
- Visual effects (blur, glow, particles, etc.)
- Text overlays or graphics
- Filters or color effects

---

## OUTPUT FORMAT:

**TECHNICAL ANALYSIS:**
(Provide detailed analysis using the framework above)

**VEO 3.1 RECREATION PROMPT:**
Create a single, comprehensive prompt (200-400 words) that includes:
- Opening: Exact first frame description
- Subject: Complete appearance details
- Environment: Full setting description  
- Camera: All movement and technical aspects
- Lighting: Complete lighting setup
- Timeline: What happens when (use timestamps)
- Style: Visual style, color grading, mood
- Ending: How the shot concludes

The prompt should be so detailed that anyone reading it could visualize the EXACT video.

Example structure:
"[Duration] [aspect ratio] cinematic video. Opens on [exact opening frame]. [Subject detailed description] is [action/position]. [Environment description]. Camera [movement type] at [speed] from [start position] to [end position]. [Lighting description]. Color palette dominated by [colors]. At [X seconds], [event]. At [Y seconds], [event]. The shot [ending description]. Style: [visual style], [color grading], [mood]."

NOW ANALYZE THIS VIDEO WITH MAXIMUM DETAIL:`;

        console.log('Analyzing video with Vertex AI Gemini 2.5 Pro...');

        try {
            // Correct format for Vertex AI SDK
            const request = {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: videoFile.type,
                                    data: buffer.toString('base64'),
                                },
                            },
                        ],
                    },
                ],
            };

            const result = await model.generateContent(request);
            const response = await result.response;
            const parts = response.candidates?.[0]?.content?.parts as Array<{ text?: string }> | undefined;
            const text =
                parts
                    ?.map((p) => p.text)
                    .filter((t): t is string => typeof t === 'string')
                    .join('') || '';

            console.log('Analysis complete. Response length:', text?.length || 0);

            // Validate response quality
            if (!text || text.length < 500) {
                console.warn('Warning: Analysis seems too short, may be incomplete');
            }

            // Save to database if requested
            let savedVideoId = null;
            if (saveToDatabase) {
                try {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
                    const supabase = createClient(supabaseUrl, supabaseKey);

                    // Get user from auth header
                    const authHeader = req.headers.get('authorization');
                    if (authHeader) {
                        const token = authHeader.replace('Bearer ', '');
                        const { data: { user } } = await supabase.auth.getUser(token);

                        if (user) {
                            const { data, error } = await supabase
                                .from('videos')
                                .insert({
                                    user_id: user.id,
                                    title: videoTitle || 'Analyzed Video',
                                    analysis_text: text,
                                    status: 'completed'
                                })
                                .select()
                                .single();

                            if (error) {
                                console.error('Error saving to database:', error);
                            } else {
                                savedVideoId = data.id;
                                console.log('Saved analysis to database with ID:', savedVideoId);
                            }
                        }
                    }
                } catch (dbError) {
                    console.error('Database error:', dbError);
                    // Continue even if database save fails
                }
            }

            return NextResponse.json({
                success: true,
                analysis: text,
                savedVideoId: savedVideoId
            });

        } catch (apiError) {
            console.error('Analysis API call failed:', apiError);
            const err = apiError as Error;
            console.error('Error name:', err?.name);
            console.error('Error message:', err?.message);
            console.error('Error details:', JSON.stringify(apiError, null, 2));

            // Return actual error, not fallback
            return NextResponse.json({
                success: false,
                error: `Video analysis failed: ${err?.message || 'Unknown error'}. Check if the video format is supported and the file is not corrupted.`,
                details: err?.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error analyzing video:', error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message || 'Internal Server Error'
        }, { status: 500 });
    }
}
