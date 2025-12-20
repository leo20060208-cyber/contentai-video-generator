import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

function getStripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is required');
    return new Stripe(key);
}

function getWebhookSecret(): string {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is required');
    return secret;
}

async function upsertProfileByUserId(params: {
    userId: string;
    plan?: string;
    subscription_status?: string | null;
    billing_interval?: string | null;
    current_period_end?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    video_credits_delta?: number;
    set_video_credits?: number;
}) {
    const supabase = createServerSupabaseClient('service');

    if (typeof params.video_credits_delta === 'number' && typeof params.set_video_credits === 'number') {
        throw new Error('Provide either video_credits_delta or set_video_credits, not both');
    }

    if (typeof params.video_credits_delta === 'number') {
        const { data: existing } = await supabase
            .from('profiles')
            .select('video_credits')
            .eq('id', params.userId)
            .maybeSingle();
        const current = existing?.video_credits ?? 0;
        const next = Math.max(0, current + params.video_credits_delta);

        await supabase.from('profiles').upsert(
            {
                id: params.userId,
                plan: params.plan,
                subscription_status: params.subscription_status,
                billing_interval: params.billing_interval,
                current_period_end: params.current_period_end,
                stripe_customer_id: params.stripe_customer_id,
                stripe_subscription_id: params.stripe_subscription_id,
                video_credits: next,
            },
            { onConflict: 'id' }
        );
        return;
    }

    await supabase.from('profiles').upsert(
        {
            id: params.userId,
            plan: params.plan,
            subscription_status: params.subscription_status,
            billing_interval: params.billing_interval,
            current_period_end: params.current_period_end,
            stripe_customer_id: params.stripe_customer_id,
            stripe_subscription_id: params.stripe_subscription_id,
            ...(typeof params.set_video_credits === 'number' ? { video_credits: params.set_video_credits } : {}),
        },
        { onConflict: 'id' }
    );
}

function starterCreditsForInterval(interval: string | null | undefined): number {
    // Monthly: 5 videos. Yearly: 60 videos.
    return interval === 'year' ? 60 : 5;
}

export async function POST(request: Request) {
    try {
        const stripe = getStripe();
        const sig = request.headers.get('stripe-signature');
        if (!sig) return NextResponse.json({ success: false, error: 'Missing stripe-signature' }, { status: 400 });

        const rawBody = await request.text();
        const event = stripe.webhooks.constructEvent(rawBody, sig, getWebhookSecret());

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = (session.client_reference_id ||
                    (typeof session.metadata?.supabaseUserId === 'string' ? session.metadata.supabaseUserId : null)) as string | null;
                if (!userId) break;

                // One-time pay-per-video: add credits
                if (session.mode === 'payment') {
                    const creditsToAddRaw = session.metadata?.credits_to_add;
                    const creditsToAdd = typeof creditsToAddRaw === 'string' ? Number(creditsToAddRaw) : 1;
                    await upsertProfileByUserId({
                        userId,
                        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
                        video_credits_delta: Number.isFinite(creditsToAdd) ? creditsToAdd : 1,
                    });
                }

                // Subscription: mark active-ish and store ids (final status will be updated by subscription events)
                if (session.mode === 'subscription') {
                    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
                    const sub = subscriptionId
                        ? ((await stripe.subscriptions.retrieve(subscriptionId)) as unknown as Stripe.Subscription)
                        : null;

                    const plan = typeof sub?.metadata?.plan === 'string' ? sub.metadata.plan : null;
                    const billingInterval = typeof sub?.metadata?.billing_interval === 'string' ? sub.metadata.billing_interval : null;
                    const periodEndSec = sub ? (sub as unknown as { current_period_end?: number }).current_period_end : undefined;

                    await upsertProfileByUserId({
                        userId,
                        plan: plan ?? undefined,
                        billing_interval: billingInterval,
                        subscription_status: sub?.status ?? 'active',
                        current_period_end: typeof periodEndSec === 'number' ? new Date(periodEndSec * 1000).toISOString() : null,
                        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
                        stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
                        set_video_credits: plan === 'starter' ? starterCreditsForInterval(billingInterval) : undefined,
                    });
                }

                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.created': {
                const sub = event.data.object as Stripe.Subscription;
                const userId = typeof sub.metadata?.supabaseUserId === 'string' ? sub.metadata.supabaseUserId : null;
                if (!userId) break;

                const plan = typeof sub.metadata?.plan === 'string' ? sub.metadata.plan : undefined;
                const interval = typeof sub.metadata?.billing_interval === 'string' ? sub.metadata.billing_interval : undefined;

                await upsertProfileByUserId({
                    userId,
                    plan,
                    billing_interval: interval ?? null,
                    subscription_status: sub.status,
                    current_period_end: typeof (sub as unknown as { current_period_end?: number }).current_period_end === 'number'
                        ? new Date(((sub as unknown as { current_period_end?: number }).current_period_end as number) * 1000).toISOString()
                        : null,
                    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : null,
                    stripe_subscription_id: sub.id,
                    // For Starter we keep credits aligned with the subscription entitlement.
                    // (This is a simplified approach; Stripe may emit multiple updates per cycle.)
                    set_video_credits: plan === 'starter' ? starterCreditsForInterval(interval ?? null) : undefined,
                });
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                const userId = typeof sub.metadata?.supabaseUserId === 'string' ? sub.metadata.supabaseUserId : null;
                if (!userId) break;

                await upsertProfileByUserId({
                    userId,
                    plan: 'Free',
                    subscription_status: sub.status,
                    billing_interval: null,
                    current_period_end: null,
                    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : null,
                    stripe_subscription_id: sub.id,
                });
                break;
            }
            default:
                break;
        }

        return NextResponse.json({ received: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

