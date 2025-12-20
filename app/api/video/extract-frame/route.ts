import { NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

// Set ffmpeg path
const ffmpegPath = ffmpegStatic || 'ffmpeg';

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function POST(req: Request) {
    try {
        const supabase = createServerSupabaseClient('service-or-anon');
        const { videoUrl, timestamp } = await req.json();

        if (!videoUrl) {
            return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
        }

        console.log(`📸 Extracting frame from video at ${timestamp || 0}s...`);

        // 1. Download video to temp
        const tempDir = os.tmpdir();
        const videoPath = path.join(tempDir, `${randomUUID()}_video.mp4`);
        const framePath = path.join(tempDir, `${randomUUID()}_frame.jpg`);

        // Download video
        const res = await fetch(videoUrl);
        if (!res.ok) throw new Error(`Failed to fetch video: ${videoUrl}`);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(videoPath, Buffer.from(buffer));

        // 2. Extract frame with FFmpeg
        await new Promise<void>((resolve, reject) => {
            ffmpeg(videoPath)
                .seekInput(timestamp || 0) // Seek to specific timestamp
                .frames(1) // Extract 1 frame
                .output(framePath)
                .on('end', () => {
                    console.log('✅ Frame extracted');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('❌ FFmpeg error:', err);
                    reject(err);
                })
                .run();
        });

        // 3. Upload frame to Supabase
        const frameContent = fs.readFileSync(framePath);
        const fileName = `frames/${Date.now()}_${randomUUID()}.jpg`;

        const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(fileName, frameContent, {
                contentType: 'image/jpeg'
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('videos')
            .getPublicUrl(fileName);

        const frameUrl = publicUrlData.publicUrl;

        // Cleanup
        try {
            fs.unlinkSync(videoPath);
            fs.unlinkSync(framePath);
        } catch (cleanupError) {
            console.error('Cleanup error', cleanupError);
        }

        return NextResponse.json({ frameUrl });

    } catch (error: unknown) {
        console.error('Error extracting frame:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
