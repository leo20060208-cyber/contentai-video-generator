import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({
                success: false,
                error: 'Missing SUPABASE_SERVICE_ROLE_KEY. Cannot perform admin delete.'
            }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Delete all rows from templates table
        const { error, count } = await supabaseAdmin
            .from('templates')
            .delete({ count: 'exact' })
            .neq('id', -1);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Deleted ${count} templates`,
            count
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
