import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

function getStripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is required');
    return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
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
                    const plan = session.subscription_details?.metadata?.plan || session.metadata?.plan || null;
                    const billingInterval = session.subscription_details?.metadata?.billing_interval || session.metadata?.billing_interval || null;
                    await upsertProfileByUserId({
                        userId,
                        plan: typeof plan === 'string' ? plan : undefined,
                        billing_interval: typeof billingInterval === 'string' ? billingInterval : undefined,
                        subscription_status: 'active',
                        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
                        stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
                        set_video_credits: typeof plan === 'string' && plan === 'starter' ? starterCreditsForInterval(typeof billingInterval === 'string' ? billingInterval : null) : undefined,
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
                    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
                    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : null,
                    stripe_subscription_id: sub.id,
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
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
                if (!subscriptionId) break;

                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const userId = typeof sub.metadata?.supabaseUserId === 'string' ? sub.metadata.supabaseUserId : null;
                const plan = typeof sub.metadata?.plan === 'string' ? sub.metadata.plan : null;
                const interval = typeof sub.metadata?.billing_interval === 'string' ? sub.metadata.billing_interval : null;
                if (!userId) break;

                // Reset starter credits on successful renewal
                if (plan === 'starter') {
                    await upsertProfileByUserId({
                        userId,
                        plan,
                        billing_interval: interval,
                        subscription_status: sub.status,
                        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
                        stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : null,
                        stripe_subscription_id: sub.id,
                        set_video_credits: starterCreditsForInterval(interval),
                    });
                } else if (plan === 'pro') {
                    await upsertProfileByUserId({
                        userId,
                        plan,
                        billing_interval: interval,
                        subscription_status: sub.status,
                        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
                        stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : null,
                        stripe_subscription_id: sub.id,
                    });
                }
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

