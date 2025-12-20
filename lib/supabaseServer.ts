import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ServerSupabaseKeyMode = 'service' | 'service-or-anon' | 'anon';

/**
 * Creates a Supabase client for server-side code (API routes).
 *
 * IMPORTANT:
 * - This must only be imported/used from server code. Do NOT import in client components.
 * - Env validation is done lazily (inside the function) to avoid Next.js build-time crashes
 *   when route modules are imported during "Collecting page data".
 */
export function createServerSupabaseClient(
  mode: ServerSupabaseKeyMode = 'service-or-anon'
): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
  }

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseKey =
    mode === 'service' ? serviceRoleKey : mode === 'anon' ? anonKey : serviceRoleKey || anonKey;

  if (!supabaseKey) {
    throw new Error('Supabase key is required.');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

