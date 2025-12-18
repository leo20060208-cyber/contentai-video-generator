import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('order_index', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
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
    } catch (error: any) {
        console.error('Error creating category:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
