
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

/**
 * Deducts credits from a user.
 * Uses Service Role Key if available to bypass RLS.
 */
export async function deductCredits(userId: string, amount: number, description: string = 'Usage'): Promise<boolean> {
    if (!isSupabaseConfigured) return true;

    // Use admin client for the transaction to ensure we can update the restricted 'credits' column
    const adminSupabase = getAdminClient();

    // 1. Get current credits
    const { data: profile, error: fetchError } = await adminSupabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

    if (fetchError || !profile) {
        console.error('Error fetching profile for deduction:', fetchError);
        return false;
    }

    const currentCredits = profile.credits || 0;

    if (currentCredits < amount) {
        console.warn(`Insufficient credits via deduct for user ${userId}. Has ${currentCredits}, needs ${amount}.`);
        return false;
    }

    // 2. Update credits
    const newCredits = currentCredits - amount;
    const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId);

    if (updateError) {
        console.error('Error updating credits:', updateError);
        return false;
    }

    // 3. Log Transaction
    try {
        await adminSupabase.from('credit_transactions').insert({
            user_id: userId,
            amount: -amount,
            type: 'deduct',
            description: description,
            balance_after: newCredits
        });
    } catch (logError) {
        console.error('Error logging credit transaction (non-fatal):', logError);
    }

    console.log(`[Credits] Deducted ${amount} from user ${userId}. New balance: ${newCredits}. Reason: ${description}`);
    return true;
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
