import { SupabaseClient } from '@supabase/supabase-js';

export type TransactionType = 'purchase' | 'subscription_refill' | 'usage' | 'adjustment' | 'bonus';

/**
 * Adds credits to a user's balance and logs the transaction.
 */
export async function addCredits(
    supabase: SupabaseClient,
    userId: string,
    amount: number,
    type: TransactionType,
    description: string
) {
    // 1. Fetch current credits
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

    if (fetchError || !profile) {
        throw new Error('User profile not found');
    }

    const currentCredits = profile.credits || 0;
    const newBalance = currentCredits + amount;

    // 2. Update Profile
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', userId);

    if (updateError) {
        throw updateError;
    }

    // 3. Log Transaction
    const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
            user_id: userId,
            amount: amount,
            type: type,
            description: description,
            balance_after: newBalance
        });

    if (txError) console.warn('[Credits] Transaction log failed:', txError);

    return newBalance;
}

/**
 * Deducts credits from a user's balance and logs the transaction.
 */
export async function deductCredits(
    supabase: SupabaseClient,
    userId: string,
    amount: number,
    description: string
) {
    // 1. Fetch current credits
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

    if (fetchError || !profile) {
        throw new Error('User profile not found');
    }

    const currentCredits = profile.credits || 0;

    if (currentCredits < amount) {
        throw new Error(`Insufficient credits: Required ${amount}, Available ${currentCredits}`);
    }

    const newBalance = currentCredits - amount;

    // 2. Update Profile
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', userId);

    if (updateError) {
        throw updateError;
    }

    // 3. Log Transaction
    const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
            user_id: userId,
            amount: -amount,
            type: 'usage',
            description: description,
            balance_after: newBalance
        });

    if (txError) console.warn('[Credits] Transaction log failed:', txError);

    return newBalance;
}
