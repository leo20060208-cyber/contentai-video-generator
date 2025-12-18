import { NextResponse } from 'next/server';
import { extractAudio } from '@/lib/audio/ffmpeg';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const videoFile = formData.get('video') as File;

        if (!videoFile) {
            return NextResponse.json(
                { error: 'Video file is required' },
                { status: 400 }
            );
        }

        console.log('Extracting audio from video:', videoFile.name);


        // Use Service Role Key for storage operations to bypass potential RLS issues
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

        // Convert file to buffer
        const arrayBuffer = await videoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract audio passing admin client
        const { audioUrl, duration } = await extractAudio(buffer, videoFile.name, adminSupabase);

        console.log('Audio extracted successfully:', audioUrl);

        return NextResponse.json({
            success: true,
            audioUrl,
            duration,
            message: 'Audio extracted successfully'
        });
    } catch (error) {
        console.error('Error extracting audio:', error);
        return NextResponse.json(
            {
                success: false,
                error: (error as Error).message || 'Failed to extract audio'
            },
            { status: 500 }
        );
    }
}
