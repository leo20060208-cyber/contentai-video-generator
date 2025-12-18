import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
    try {
        const { templateId, isTrending } = await req.json();

        console.log('API: Updating trending status for template:', templateId, 'to:', isTrending);

        const { data, error } = await supabase
            .from('templates')
            .update({ is_trending: isTrending })
            .eq('id', templateId)
            .select();

        console.log('API: Database response:', { data, error });

        if (error) {
            console.error('API: Database error:', error);
            throw error;
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('API: Error updating trending:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
