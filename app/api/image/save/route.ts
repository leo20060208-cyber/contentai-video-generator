import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Standard)
// Initialize Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, prompt, userId } = body;

        // Extract Auth Token
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        // Choose the best client:
        // 1. Service Role (Admin) - if available, always works
        // 2. Authenticated User Client - if token provided, works with RLS
        // 3. Anon Client - worst case, might fail RLS
        let supabase;

        if (supabaseServiceKey) {
            console.log('[API Save Image] Using Service Role Key (Admin)');
            supabase = createClient(supabaseUrl, supabaseServiceKey);
        } else if (token) {
            console.log('[API Save Image] Using User Session Token');
            supabase = createClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: `Bearer ${token}` } }
            });
        } else {
            console.log('[API Save Image] WARNING: Using Anon Key without Token (Likely to fail RLS)');
            supabase = createClient(supabaseUrl, supabaseAnonKey);
        }

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Insert into 'images' table
        const { data, error } = await supabase.from('images').insert({
            user_id: userId || 'mock-user-id',
            url: url,
            prompt: prompt,
            created_at: new Date().toISOString()
        }).select();

        if (error) {
            console.error('[API Save Image] DB Insert FAILED:', error);
            // Return the actual error to the client so we can debug
            return NextResponse.json({
                error: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            }, { status: 500 });
        }

        console.log('[API Save Image] Success:', data);
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('[API Save Image] Exception:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
