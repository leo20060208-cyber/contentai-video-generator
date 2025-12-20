import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    name: string | null;
    avatar_url: string | null;
    plan: 'Free' | 'starter' | 'pro' | string;
    subscription_status?: string | null;
    billing_interval?: 'month' | 'year' | string | null;
    current_period_end?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    video_credits?: number | null;
    created_at: string;
}

function getBestEffortNameFromUser(user: User): string | null {
    const meta = user.user_metadata as Record<string, unknown> | null | undefined;
    const candidates = [
        meta?.full_name,
        meta?.name,
        meta?.given_name,
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim().length > 0) return c.trim();
    }
    return null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1);

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data?.[0] || null;
}

/**
 * Fetches the user's profile, creating a default one if missing.
 * Useful for OAuth logins (Google) where we don't manually create profiles at signup time.
 */
export async function getOrCreateProfile(params: { userId: string; user?: User }): Promise<Profile | null> {
    const existing = await getProfile(params.userId);
    if (existing) return existing;

    const derivedName = params.user ? getBestEffortNameFromUser(params.user) : null;

    try {
        // Only create when missing; keep plan default to Free.
        return await updateProfile(params.userId, { name: derivedName, plan: 'Free' });
    } catch {
        // Best-effort fallback
        return await getProfile(params.userId);
    }
}

export async function updateProfile(
    userId: string,
    updates: Partial<Omit<Profile, 'id' | 'created_at'>>
): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...updates }) // Use upsert to create if missing
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to update profile: ${error.message || 'Unknown error'}`);
    }

    return data;
}
