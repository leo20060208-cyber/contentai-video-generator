import { NextResponse } from 'next/server';
import { mergeAudioVideo } from '@/lib/audio/ffmpeg';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { videoUrl, audioUrl } = body;

        if (!videoUrl || !audioUrl) {
            return NextResponse.json(
                { error: 'Video URL and audio URL are required' },
                { status: 400 }
            );
        }

        console.log('Merging video and audio...');
        console.log('Video:', videoUrl);
        console.log('Audio:', audioUrl);

        // Merge audio and video
        const mergedVideoUrl = await mergeAudioVideo(videoUrl, audioUrl);

        console.log('Merge successful:', mergedVideoUrl);

        return NextResponse.json({
            success: true,
            videoUrl: mergedVideoUrl,
            message: 'Audio and video merged successfully'
        });
    } catch (error) {
        console.error('Error merging audio and video:', error);
        return NextResponse.json(
            {
                success: false,
                error: (error as Error).message || 'Failed to merge audio and video'
            },
            { status: 500 }
        );
    }
}
