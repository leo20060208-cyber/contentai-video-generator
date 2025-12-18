import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const { title, videoUrl, duration } = await req.json();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        // Use service role key if available for robust backend operations
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Auth check
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Insert new video
        const { data, error } = await supabase
            .from('videos')
            .insert({
                user_id: user.id,
                title: title || `Nuevo Proyecto ${new Date().toLocaleDateString()}`,
                video_url: videoUrl,
                duration: duration || 0,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, video: data });

    } catch (error) {
        console.error('Error creating video:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
