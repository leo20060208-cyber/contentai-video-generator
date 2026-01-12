import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface Profile {
    id: string;
    name: string | null;
    avatar_url: string | null;
    plan: string;
    credits: number;
    subscription_status: 'active' | 'inactive' | 'trial' | 'past_due' | 'canceled' | null;
    created_at: string;
    subscription_period_end?: string | null;
    stripe_customer_id?: string | null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) {
        return {
            id: userId,
            name: 'Offline User',
            avatar_url: null,
            plan: 'Free',
            credits: 100,
            subscription_status: null,
            created_at: new Date().toISOString()
        };
    }
    if (!userId) {
        console.warn('getProfile called with empty userId');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(); // Use maybeSingle instead of limit(1) to cleaner handle 0 or 1 rows

        if (error) {
            // Enhanced logging
            console.error('Error fetching profile:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return null;
        }

        return data || null;
    } catch (err) {
        console.error('Unexpected error in getProfile:', err);
        return null;
    }
}

export async function updateProfile(
    userId: string,
    updates: Partial<Omit<Profile, 'id' | 'created_at'>>
): Promise<Profile | null> {
    if (!isSupabaseConfigured) {
        console.warn('⚠️ Offline Mode: Cannot update profile.');
        return null;
    }

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
