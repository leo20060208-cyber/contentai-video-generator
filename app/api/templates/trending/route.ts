import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
    try {
        const supabase = createServerSupabaseClient('service-or-anon');
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
    } catch (error: unknown) {
        console.error('API: Error updating trending:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
