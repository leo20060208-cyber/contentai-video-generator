
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Set ffmpeg path
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export const runtime = 'nodejs'; // Required for filesystem access

export async function POST(request: Request) {
    let tempVideoPath = '';
    let tempAudioPath = '';
    let tempOutputPath = '';

    try {
        const { videoUrl, audioUrl, taskId } = await request.json();

        if (!videoUrl || !audioUrl) {
            return NextResponse.json({ error: 'Missing videoUrl or audioUrl' }, { status: 400 });
        }

        console.log(`[Mux] Starting for task ${taskId}`);
        console.log(`[Mux] Video: ${videoUrl}`);
        console.log(`[Mux] Audio Source: ${audioUrl}`);

        // 1. Setup paths
        const tmpDir = os.tmpdir();
        const id = uuidv4();
        tempVideoPath = path.join(tmpDir, `${id}_video.mp4`);
        tempAudioPath = path.join(tmpDir, `${id}_audio.mp4`);
        tempOutputPath = path.join(tmpDir, `${id}_out.mp4`);

        // 2. Download files
        await downloadFile(videoUrl, tempVideoPath);
        await downloadFile(audioUrl, tempAudioPath);

        // 3. Process with FFmpeg
        // Take video from input 0, audio from input 1.
        // Map 0:v:0 (First video stream of first input)
        // Map 1:a:0 (First audio stream of second input)
        // -shortest: Finish when the shortest stream ends (usually the generated video which is 5s)
        // -c:v copy: Copy video stream (no re-encoding, fast)
        // -c:a aac: Re-encode audio to aac for compatibility
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(tempVideoPath)
                .input(tempAudioPath)
                .outputOptions([
                    '-map 0:v:0',
                    '-map 1:a:0',
                    '-c:v copy',
                    '-c:a aac',
                    '-shortest'
                ])
                .save(tempOutputPath)
                .on('end', resolve)
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                });
        });

        console.log('[Mux] FFmpeg processing complete');

        // 4. Upload to Supabase Storage
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const fileBuffer = fs.readFileSync(tempOutputPath);
        const fileName = `muxed_${id}.mp4`;

        const { data, error: uploadError } = await supabase.storage
            .from('videos') // Ensure this bucket exists
            .upload(fileName, fileBuffer, {
                contentType: 'video/mp4',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('videos')
            .getPublicUrl(fileName);

        // Update the video record in DB if taskId is present
        if (taskId) {
            await supabase
                .from('videos')
                .update({ video_url: publicUrl }) // Update to the new muxed video
                .eq('task_id', taskId);
        }

        console.log('[Mux] Upload complete:', publicUrl);

        return NextResponse.json({
            success: true,
            url: publicUrl
        });

    } catch (error) {
        console.error('[Mux] Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        // Cleanup temp files
        safeUnlink(tempVideoPath);
        safeUnlink(tempAudioPath);
        safeUnlink(tempOutputPath);
    }
}

async function downloadFile(url: string, dest: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
}

function safeUnlink(path: string) {
    try {
        if (fs.existsSync(path)) fs.unlinkSync(path);
    } catch (e) {
        console.error(`Failed to unlink ${path}`, e);
    }
}
