import { supabase } from '@/lib/supabase';

export interface Profile {
    id: string;
    name: string | null;
    avatar_url: string | null;
    plan: string;
    created_at: string;
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
