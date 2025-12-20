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

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
    try {
        const { videoUrl, audioUrl, videoId, audioStoragePath, videoStoragePath } = await req.json();

        if (!videoUrl || !audioUrl) {
            return NextResponse.json({ error: 'Missing videoUrl or audioUrl' }, { status: 400 });
        }

        console.log(`🎵 Merging audio for video ${videoId || 'unknown'}...`);
        console.log(`Video: ${videoUrl}`);
        console.log(`Audio: ${audioUrl}`);

        // 1. Download Files to Temp
        const tempDir = os.tmpdir();
        const videoPath = path.join(tempDir, `${uuidv4()}_video.mp4`);
        // NOTE: audioUrl might actually be a *video* file (we extract its audio track).
        const audioPath = path.join(tempDir, `${uuidv4()}_audio_source.mp4`);
        const outputPath = path.join(tempDir, `${uuidv4()}_output.mp4`);

        // Helper to download (prefer Supabase path if provided; works even if bucket is private)
        const downloadFile = async (url: string, dest: string, storagePath?: string) => {
            if (storagePath) {
                const { data, error } = await supabase.storage.from('videos').download(storagePath);
                if (error || !data) throw new Error(`Failed to download from Supabase storage path: ${storagePath}`);
                const buffer = await data.arrayBuffer();
                fs.writeFileSync(dest, Buffer.from(buffer));
                return;
            }

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
            downloadFile(videoUrl, videoPath, typeof videoStoragePath === 'string' ? videoStoragePath : undefined),
            downloadFile(audioUrl, audioPath, typeof audioStoragePath === 'string' ? audioStoragePath : undefined)
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
                    // Optional audio map: if source has no audio, don't hard-fail the whole request
                    '-map 1:a:0?',
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

        // Return a signed URL when possible (works for private buckets)
        const signed = await supabase.storage.from('videos').createSignedUrl(uploadPath, 60 * 60);
        const finalUrl = signed.data?.signedUrl || publicUrlData.publicUrl;

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
