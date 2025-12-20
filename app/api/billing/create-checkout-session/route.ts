import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

type BillingInterval = 'month' | 'year';
type PlanId = 'starter' | 'pro';

function getStripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is required');
    return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

function getPriceId(params: { plan: PlanId; interval: BillingInterval }): string {
    const { plan, interval } = params;

    const envKey =
        plan === 'starter' && interval === 'month'
            ? 'STRIPE_PRICE_STARTER_MONTHLY'
            : plan === 'starter' && interval === 'year'
                ? 'STRIPE_PRICE_STARTER_YEARLY'
                : plan === 'pro' && interval === 'month'
                    ? 'STRIPE_PRICE_PRO_MONTHLY'
                    : 'STRIPE_PRICE_PRO_YEARLY';

    const priceId = process.env[envKey];
    if (!priceId) throw new Error(`${envKey} is required`);
    return priceId;
}

export async function POST(request: Request) {
    try {
        const stripe = getStripe();
        const supabase = createServerSupabaseClient('service');

        const authHeader = request.headers.get('authorization') ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const user = userData.user;

        const body = (await request.json()) as
            | { kind: 'subscription'; plan: PlanId; interval: BillingInterval; next?: string }
            | { kind: 'pay_per_video'; next?: string };

        const url = new URL(request.url);
        const origin = url.origin;
        const next = (body.next && body.next.trim().length > 0 ? body.next : '/profile') as string;

        // Load profile (for existing customer id)
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .maybeSingle();

        let customerId = profile?.stripe_customer_id ?? null;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email ?? undefined,
                metadata: { supabaseUserId: user.id },
            });
            customerId = customer.id;
            await supabase.from('profiles').upsert({ id: user.id, stripe_customer_id: customerId }, { onConflict: 'id' });
        }

        if (body.kind === 'subscription') {
            const priceId = getPriceId({ plan: body.plan, interval: body.interval });

            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                customer: customerId,
                client_reference_id: user.id,
                line_items: [{ price: priceId, quantity: 1 }],
                subscription_data: {
                    metadata: {
                        supabaseUserId: user.id,
                        plan: body.plan,
                        billing_interval: body.interval,
                    },
                },
                success_url: `${origin}/pricing?success=1&next=${encodeURIComponent(next)}`,
                cancel_url: `${origin}/pricing?canceled=1`,
            });

            return NextResponse.json({ success: true, data: { url: session.url } });
        }

        const payPerVideoPrice = process.env.STRIPE_PRICE_PAY_PER_VIDEO;
        if (!payPerVideoPrice) throw new Error('STRIPE_PRICE_PAY_PER_VIDEO is required');

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer: customerId,
            client_reference_id: user.id,
            line_items: [{ price: payPerVideoPrice, quantity: 1 }],
            metadata: {
                supabaseUserId: user.id,
                credits_to_add: '1',
                kind: 'pay_per_video',
            },
            success_url: `${origin}/pricing?success=1&next=${encodeURIComponent(next)}`,
            cancel_url: `${origin}/pricing?canceled=1`,
        });

        return NextResponse.json({ success: true, data: { url: session.url } });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

