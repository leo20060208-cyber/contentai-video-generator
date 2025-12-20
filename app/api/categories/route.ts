import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET() {
    try {
        const supabase = createServerSupabaseClient('service-or-anon');
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('order_index', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: unknown) {
        console.error('Error fetching categories:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = createServerSupabaseClient('service-or-anon');
        const { name, description, icon } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Generate slug from name
        const slug = name.toLowerCase().replace(/\s+/g, '-');

        // Get max order_index
        const { data: maxData } = await supabase
            .from('categories')
            .select('order_index')
            .order('order_index', { ascending: false })
            .limit(1)
            .single();

        const nextOrder = (maxData?.order_index || 0) + 1;

        const { data, error } = await supabase
            .from('categories')
            .insert({
                name,
                slug,
                description,
                icon,
                order_index: nextOrder
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('Error creating category:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
