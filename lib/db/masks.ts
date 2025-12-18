import { supabase } from '@/lib/supabase';

export interface UserMask {
    id: string;
    user_id: string;
    url: string; // The URL of the stored transparent image
    name?: string;
    created_at: string;
}

export async function getUserMasks(userId: string): Promise<UserMask[]> {
    const { data, error } = await supabase
        .from('user_masks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching masks:', error);
        return [];
    }

    return data || [];
}

export async function saveUserMask(userId: string, blobUrlOrBase64: string, name: string = 'Untitled Mask'): Promise<UserMask | null> {
    try {
        // 1. Upload to Storage
        const blob = await fetch(blobUrlOrBase64).then(r => r.blob());
        const fileName = `${userId}/${Date.now()}_mask.png`;

        const { error: uploadError } = await supabase.storage
            .from('masks')
            .upload(fileName, blob, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('masks')
            .getPublicUrl(fileName);

        // 2. Insert into DB
        const { data, error: dbError } = await supabase
            .from('user_masks')
            .insert({
                user_id: userId,
                url: publicUrl,
                name: name
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return data;
    } catch (e) {
        console.error('Error saving mask:', e);
        return null;
    }
}

export async function deleteUserMask(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_masks')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting mask:', error);
        return false;
    }
    return true;
}
