
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Checks if a user has enough credits.
 * @param userId The user ID to check.
 * @param amount The amount of credits required.
 * @returns Promise<boolean> True if user has >= amount credits.
 */
export async function checkCredits(userId: string, amount: number): Promise<boolean> {
    if (!isSupabaseConfigured) return true; // Offline mode allowance

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        console.error('Error checking credits:', error);
        return false; // Fail safe
    }

    return (profile.credits || 0) >= amount;
}

/**
 * Deducts credits from a user.
 * This should ideally be a database function (RPC) to ensure atomicity,
 * but for now we do a read-modify-write or use a direct decrement query if valid.
 * To avoid race conditions, we can use an RPC if available, or just standard update.
 * For this implementation, we will fetch current, subtract, and update.
 * @param userId 
 * @param amount 
 * @param description Optional description for transaction log (if we implement one later)
 */
import { createClient } from '@supabase/supabase-js';

// Helper to get admin client
const getAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
        return createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }
    return supabase;
};

export async function deductCredits(userId: string, amount: number, description: string = 'Usage'): Promise<{ success: boolean; error?: any }> {
    if (!isSupabaseConfigured) return { success: true };

    const adminSupabase = getAdminClient();

    try {
        const { data, error } = await adminSupabase.rpc('deduct_credits_v2', {
            p_user_id: userId,
            p_amount: amount,
            p_description: description
        });

        if (error) {
            console.error('Error deducting credits via RPC:', error);
            return { success: false, error: error };
        }

        if (data === true) {
            console.log(`[Credits] Deducted ${amount} from user ${userId}. Reason: ${description}`);
            return { success: true };
        } else {
            // Get current credits for logging purposes
            const { data: profile } = await adminSupabase.from('profiles').select('credits').eq('id', userId).single();
            const current = profile?.credits ?? 'unknown';
            console.warn(`[Credits] Failed to deduct ${amount}. User ${userId} has ${current}.`);
            return { success: false, error: { message: `RPC returned false. Balance: ${current}, Needed: ${amount}` } };
        }
    } catch (err) {
        console.error('Unexpected error in deductCredits RPC:', err);
        return { success: false, error: err };
    }
}

export const CREDIT_COSTS = {
    // Updated to match ImageCreateFlow
    IMAGE_GENERATION: 6,
    IMAGE_GENERATION_PRO: 18,
    // Updated to match NewVideoCreateFlow/API
    VIDEO_GENERATION_5S: 75,
    VIDEO_GENERATION_10S: 95,
    VIDEO_GENERATION_15S: 135,
};
