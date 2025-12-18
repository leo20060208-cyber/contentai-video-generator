import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mixAudioTracks } from '@/lib/audio/ffmpeg';

export async function POST(req: Request) {
    try {
        const { videoUrl, audioTracks, videoId, aspectRatio } = await req.json();

        if (!videoUrl) {
            return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
        }

        // --- Authentication ---
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '');

        // Client for Auth Verification
        const authenticatedSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            }
        );

        // Admin Client for DB Operations (Bypass RLS for robust writes)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user for saving logic
        const { data: { user } } = await authenticatedSupabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 });
        }

        console.log('Exporting video:', videoUrl);
        console.log('Audio tracks:', audioTracks?.length || 0);

        // Prepare tracks for mixer
        // Map frontend AudioTrack to mixer format
        // Frontend: trimStart (timeline start), trimEnd (timeline end)
        // Mixer: startTime (timeline start), duration, sourceStartTime

        const mixerTracks = (audioTracks || []).map((track: { url: string; trimStart: number; trimEnd: number }) => {
            // Logic: 
            // trimStart in frontend is WHERE IT STARTS PLAYING in the timeline.
            // trimEnd in frontend is WHERE IT STOPS PLAYING in the timeline.
            // Duration = trimEnd - trimStart.
            // Source Start: Currently we assume we play from the BEGINNING of the source file 
            // if it's the first segment, OR if we split... 
            // LIMITATION: Frontend Split logic updates the object but doesn't track "source offset".
            // We assumed in frontend that trimStart/End are ABSOLUTE timeline positions.
            // And we assumed "source content" magically matches.
            // If we really just split, Pista 1 (0-5) plays 0-5 of file. Pista 2 (5-10) plays 5-10 of file.
            // So sourceStartTime SHOULD be trimStart (if the file was meant to be synchronized from t=0).
            // Let's assume audio is meant to be synched to video start initially.

            return {
                url: track.url,
                startTime: track.trimStart,
                duration: track.trimEnd - track.trimStart,
                sourceStartTime: track.trimStart // Assuming linear mapping for now
            };
        });

        // 3. Create initial DB Record (Processing)
        const { data: savedVideo, error: dbError } = await adminSupabase
            .from('videos')
            .insert({
                user_id: user.id,
                title: `Exported Video ${new Date().toLocaleString()}`,
                video_url: '', // Placeholder
                status: 'processing',
                has_audio: true,
                project_data: { parent_video_id: videoId }
            })
            .select()
            .single();

        if (dbError) throw dbError;

        // 4. Start Processing in Background (Fire & Forget)
        // Note: In serverless environments, this might require a proper queue.
        // For current setup, we let the promise run detached.
        mixAudioTracks(videoUrl, mixerTracks, adminSupabase, aspectRatio)
            .then(async (exportedVideoUrl) => {
                console.log('Background export finished:', exportedVideoUrl);
                await adminSupabase
                    .from('videos')
                    .update({
                        video_url: exportedVideoUrl,
                        status: 'completed'
                    })
                    .eq('id', savedVideo.id);
            })
            .catch(async (err) => {
                console.error('Background export failed:', err);
                await adminSupabase
                    .from('videos')
                    .update({ status: 'failed' })
                    .eq('id', savedVideo.id);
            });

        console.log('Export started for video:', savedVideo.id);

        return NextResponse.json({
            success: true,
            message: 'Exportación iniciada',
            savedVideo
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: (error as Error).message || 'Export failed' }, { status: 500 });
    }
}
