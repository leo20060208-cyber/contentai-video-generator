const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

// Simple check: just verify strings are not empty
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase environment variables missing. App running in Offline Mode.');
}

// Create a single supabase client for the browser
// using createBrowserClient ensures cookies are used for auth persistence
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            detectSessionInUrl: true,
            autoRefreshToken: true,
            persistSession: true,
        },
    }
);
