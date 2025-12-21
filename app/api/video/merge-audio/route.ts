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
    console.error('ffmpeg-static not found, trying system ffmpeg', e);
    ffmpegPath = 'ffmpeg'; // Hope it's in PATH
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
        const { videoUrl, audioUrl, videoId } = await req.json();

        if (!videoUrl || !audioUrl) {
            return NextResponse.json({ error: 'Missing videoUrl or audioUrl' }, { status: 400 });
        }

        console.log(`🎵 Merging audio for video ${videoId || 'unknown'}...`);
        console.log(`Video: ${videoUrl}`);
        console.log(`Audio: ${audioUrl}`);

        // 1. Download Files to Temp
        const tempDir = os.tmpdir();
        const videoPath = path.join(tempDir, `${uuidv4()}_video.mp4`);
        const audioPath = path.join(tempDir, `${uuidv4()}_audio.mp3`);
        const outputPath = path.join(tempDir, `${uuidv4()}_output.mp4`);

        // Helper to download
        const downloadFile = async (url: string, dest: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch ${url}`);
            const buffer = await res.arrayBuffer();
            fs.writeFileSync(dest, Buffer.from(buffer));
        };

        if (videoUrl.includes('data:')) {
            // Handle base64 if needed, but usually URLs
            // For now assume URLs
        }

        await Promise.all([
            downloadFile(videoUrl, videoPath),
            downloadFile(audioUrl, audioPath)
        ]);

        // 2. Merge with FFMPEG
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(videoPath)
                .input(audioPath)
                // Map video from input 0, audio from input 1
                .outputOptions([
                    '-c:v copy', // Copy video stream (fast)
                    '-c:a aac',  // Encode audio to aac
                    '-map 0:v:0',
                    '-map 1:a:0',
                    '-shortest' // Finish when the shortest stream ends (usually video)
                ])
                .save(outputPath)
                .on('end', () => {
                    console.log('✅ Merge completed');
                    resolve(null);
                })
                .on('error', (err) => {
                    console.error('❌ FFMpeg error:', err);
                    reject(err);
                });
        });

        // 3. Upload Result to Supabase
        const fileContent = fs.readFileSync(outputPath);
        const fileName = `merged_${Date.now()}_${uuidv4()}.mp4`;
        const uploadPath = `valid_generations/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('videos')
            .upload(uploadPath, fileContent, {
                contentType: 'video/mp4'
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('videos')
            .getPublicUrl(uploadPath);

        const finalUrl = publicUrlData.publicUrl;

        // Cleanup
        try {
            fs.unlinkSync(videoPath);
            fs.unlinkSync(audioPath);
            fs.unlinkSync(outputPath);
        } catch (e) { console.error('Cleanup error', e); }

        return NextResponse.json({ url: finalUrl });

    } catch (error: any) {
        console.error('Error merging audio:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
