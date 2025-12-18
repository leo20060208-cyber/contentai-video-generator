import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const { videoId, projectData } = await req.json();

        if (!videoId || !projectData) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        // Use service role key if available to ensure we can write to the DB regardless of RLS complexity
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Update video with project data
        const { error } = await supabase
            .from('videos')
            .update({
                project_data: projectData,
                updated_at: new Date().toISOString()
            })
            .eq('id', videoId)
            .eq('user_id', user.id);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error saving project:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
