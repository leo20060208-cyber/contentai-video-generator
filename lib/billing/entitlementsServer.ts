import { createServerSupabaseClient } from '@/lib/supabaseServer';

export type BillingPlan = 'starter' | 'pro' | 'Free';

export interface BillingEntitlementResult {
    ok: boolean;
    userId?: string;
    plan?: string | null;
    subscriptionStatus?: string | null;
    videoCredits?: number | null;
    error?: string;
}

function isActiveSubscription(status: string | null | undefined): boolean {
    return status === 'active' || status === 'trialing';
}

/**
 * Enforces billing for a "generate video" action.
 *
 * Rules:
 * - Pro + active subscription => allowed (unlimited)
 * - Starter + active subscription => allowed if has credits; consumes 1 credit
 * - No active subscription => allowed only if has pay-per-video credits; consumes 1 credit
 */
export async function requireVideoGenerationEntitlement(params: {
    authorizationHeader: string | null;
}): Promise<BillingEntitlementResult> {
    const authHeader = params.authorizationHeader ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!token) return { ok: false, error: 'Unauthorized' };

    const supabase = createServerSupabaseClient('service');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return { ok: false, error: 'Unauthorized' };

    const userId = userData.user.id;

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, subscription_status, video_credits')
        .eq('id', userId)
        .maybeSingle();

    if (profileError) {
        return { ok: false, userId, error: 'Failed to load billing profile' };
    }

    const plan = (profile?.plan ?? 'Free') as string;
    const subscriptionStatus = (profile?.subscription_status ?? null) as string | null;
    const videoCredits = typeof profile?.video_credits === 'number' ? profile.video_credits : 0;

    // Pro: only requires active subscription
    if (plan === 'pro') {
        if (!isActiveSubscription(subscriptionStatus)) {
            return {
                ok: false,
                userId,
                plan,
                subscriptionStatus,
                videoCredits,
                error: 'Subscription required',
            };
        }
        return { ok: true, userId, plan, subscriptionStatus, videoCredits };
    }

    // Starter: requires active subscription + credits
    if (plan === 'starter') {
        if (!isActiveSubscription(subscriptionStatus)) {
            return {
                ok: false,
                userId,
                plan,
                subscriptionStatus,
                videoCredits,
                error: 'Subscription required',
            };
        }
        if (videoCredits <= 0) {
            return {
                ok: false,
                userId,
                plan,
                subscriptionStatus,
                videoCredits,
                error: 'No credits remaining',
            };
        }

        const { data: consumed } = await supabase.rpc('consume_video_credit', { p_user_id: userId });
        if (consumed !== true) {
            return {
                ok: false,
                userId,
                plan,
                subscriptionStatus,
                videoCredits,
                error: 'No credits remaining',
            };
        }

        return { ok: true, userId, plan, subscriptionStatus, videoCredits: videoCredits - 1 };
    }

    // No active subscription: pay-per-video credits
    if (videoCredits <= 0) {
        return {
            ok: false,
            userId,
            plan,
            subscriptionStatus,
            videoCredits,
            error: 'Payment required',
        };
    }

    const { data: consumed } = await supabase.rpc('consume_video_credit', { p_user_id: userId });
    if (consumed !== true) {
        return {
            ok: false,
            userId,
            plan,
            subscriptionStatus,
            videoCredits,
            error: 'Payment required',
        };
    }

    return { ok: true, userId, plan, subscriptionStatus, videoCredits: videoCredits - 1 };
}

