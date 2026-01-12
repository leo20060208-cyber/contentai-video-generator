
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserMask } from './masks';

export async function linkUserMask(userId: string, url: string, name: string): Promise<UserMask | null> {
    if (!isSupabaseConfigured) return null;

    try {
        // Check if mask with this URL already exists for user to avoid duplicates
        const { data: existing } = await supabase
            .from('user_masks')
            .select('id')
            .eq('user_id', userId)
            .eq('url', url)
            .single();

        if (existing) {
            console.log('Mask already saved for user');
            return null;
        }

        const { data, error } = await supabase
            .from('user_masks')
            .insert({
                user_id: userId,
                url: url,
                name: name
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (e) {
        console.error('Error linking mask:', e);
        return null;
    }
}

export async function unlinkUserMask(userId: string, url: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    try {
        const { error } = await supabase
            .from('user_masks')
            .delete()
            .eq('user_id', userId)
            .eq('url', url);

        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Error unlinking mask:', e);
        return false;
    }
}
