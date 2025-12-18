import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const videoUrl = formData.get('videoUrl') as string;
        const refinementPrompt = formData.get('refinementPrompt') as string;
        const parentVideoId = formData.get('parentVideoId') as string | null;
        const videoTitle = formData.get('videoTitle') as string | null;

        if (!videoUrl || !refinementPrompt) {
            return NextResponse.json({ error: 'Video URL and refinement prompt are required' }, { status: 400 });
        }

        const replicateToken = process.env.REPLICATE_API_TOKEN;

        if (!replicateToken) {
            return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 });
        }

        console.log('Initializing Replicate for video refinement...');
        const replicate = new Replicate({
            auth: replicateToken,
        });

        console.log('Refining video with prompt:', refinementPrompt);

        try {
            // Use Google Veo 3.1 model for refinement
            const output = await replicate.run(
                "google/veo-3.1",
                {
                    input: {
                        prompt: refinementPrompt,
                        video: videoUrl  // Use existing video as input
                    }
                }
            );

            console.log('Replicate refinement response:', output);

            // Extract video URL from response
            let refinedVideoUrl;
            if (typeof output === 'string') {
                refinedVideoUrl = output;
            } else if (Array.isArray(output)) {
                refinedVideoUrl = output[0];
            } else if (output && typeof output === 'object') {
                refinedVideoUrl = output.toString();
            }

            console.log('Extracted refined video URL:', refinedVideoUrl);

            // Save refined video to database
            let savedVideoId = null;
            if (refinedVideoUrl) {
                try {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
                                    title: videoTitle || 'Refined Video',
                                    video_url: refinedVideoUrl,
                                    source_video_url: videoUrl,
                                    refinement_prompt: refinementPrompt,
                                    parent_video_id: parentVideoId,
                                    status: 'completed'
                                })
                                .select()
                                .single();

                            if (error) {
                                console.error('Error saving refined video:', error);
                            } else {
                                savedVideoId = data.id;
                                console.log('Saved refined video with ID:', savedVideoId);
                            }
                        }
                    }
                } catch (dbError) {
                    console.error('Database error:', dbError);
                }
            }

            return NextResponse.json({
                success: true,
                message: 'Video refined successfully',
                videoUrl: refinedVideoUrl,
                savedVideoId: savedVideoId
            });

        } catch (apiError) {
            console.error('Replicate API call failed:', apiError);
            // safe cast or check
            const safeError = apiError as any; // eslint-disable-line @typescript-eslint/no-explicit-any

            if (safeError.response?.status === 402) {
                return NextResponse.json({
                    success: false,
                    error: 'Replicate credit required',
                    message: 'Insufficient credit. Please add credit at https://replicate.com/account/billing',
                    needsCredit: true
                }, { status: 402 });
            }

            return NextResponse.json({
                success: false,
                error: safeError.message || 'Video refinement failed',
                message: 'Unable to refine video. Please try again later.'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error refining video:', error);
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
    }
}
