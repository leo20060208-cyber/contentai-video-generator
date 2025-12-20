import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_CATEGORIES = [
    { id: '1', name: 'VISUAL', slug: 'visual', order_index: 1, is_active: true, created_at: '', updated_at: '' },
    { id: '2', name: 'CLOTHING BRANDS', slug: 'clothing-brands', order_index: 2, is_active: true, created_at: '', updated_at: '' },
    { id: '3', name: 'ASMR', slug: 'asmr', order_index: 3, is_active: true, created_at: '', updated_at: '' },
    { id: '4', name: 'VISUAL TEMPLATES', slug: 'visual-templates', order_index: 4, is_active: true, created_at: '', updated_at: '' },
    { id: '5', name: 'DROP SHIPPING', slug: 'drop-shipping', order_index: 5, is_active: true, created_at: '', updated_at: '' },
    { id: '6', name: 'ECOMMERCE', slug: 'ecommerce', order_index: 6, is_active: true, created_at: '', updated_at: '' },
    { id: '7', name: 'BRAND', slug: 'brand', order_index: 7, is_active: true, created_at: '', updated_at: '' },
];

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
        // If the table doesn't exist yet, return defaults instead of 500.
        // Postgres: 42P01 = undefined_table
        const code = typeof error?.code === 'string' ? error.code : null;
        const msg = typeof error?.message === 'string' ? error.message : '';
        const isMissingTable = code === '42P01' || msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('categories') && msg.toLowerCase().includes('does not exist');
        if (isMissingTable) {
            return NextResponse.json(DEFAULT_CATEGORIES, { status: 200 });
        }
        return NextResponse.json({ error: msg || 'Failed to fetch categories' }, { status: 500 });
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
