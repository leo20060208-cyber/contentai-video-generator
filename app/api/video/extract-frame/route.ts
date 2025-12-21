import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Set ffmpeg path
let ffmpegPath = '';
try {
    const ffmpegStatic = require('ffmpeg-static');
    ffmpegPath = ffmpegStatic;
} catch (e) {
    console.error('ffmpeg-static not found, using system ffmpeg', e);
    ffmpegPath = 'ffmpeg';
}

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

// Helper to get Supabase client (lazy initialization to avoid build-time errors)
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
    }
    
    return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: Request) {
    const supabase = getSupabaseClient();
    try {
        const { videoUrl, timestamp } = await req.json();

        if (!videoUrl) {
            return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
        }

        console.log(`📸 Extracting frame from video at ${timestamp || 0}s...`);

        // 1. Download video to temp
        const tempDir = os.tmpdir();
        const videoPath = path.join(tempDir, `${uuidv4()}_video.mp4`);
        const framePath = path.join(tempDir, `${uuidv4()}_frame.jpg`);

        // Download video
        const res = await fetch(videoUrl);
        if (!res.ok) throw new Error(`Failed to fetch video: ${videoUrl}`);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(videoPath, Buffer.from(buffer));

        // 2. Extract frame with FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .seekInput(timestamp || 0) // Seek to specific timestamp
                .frames(1) // Extract 1 frame
                .output(framePath)
                .on('end', () => {
                    console.log('✅ Frame extracted');
                    resolve(null);
                })
                .on('error', (err) => {
                    console.error('❌ FFmpeg error:', err);
                    reject(err);
                })
                .run();
        });

        // 3. Upload frame to Supabase
        const frameContent = fs.readFileSync(framePath);
        const fileName = `frames/${Date.now()}_${uuidv4()}.jpg`;

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
        } catch (e) { console.error('Cleanup error', e); }

        return NextResponse.json({ frameUrl });

    } catch (error: any) {
        console.error('Error extracting frame:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
