import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

        // Fetch user's saved analyses
        const { data, error } = await supabase
            .from('videos')
            .select('id, title, analysis_text, created_at')
            .eq('user_id', user.id)
            .not('analysis_text', 'is', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching analyses:', error);
            return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
        }

        return NextResponse.json({ success: true, analyses: data });

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
    }
}
