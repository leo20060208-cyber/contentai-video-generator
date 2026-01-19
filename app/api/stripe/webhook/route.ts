import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getPlanByPriceId } from '@/lib/stripe/config';
import { addCredits } from '@/lib/credits';

export const runtime = 'nodejs';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

// Initialize Supabase with Service Role (bypasses RLS)
function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key);
}

export async function POST(request: Request) {
    console.log('[Webhook] ========== NEW REQUEST ==========');

    const body = await request.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    // Parse event
    try {
        if (secret && sig) {
            event = stripe.webhooks.constructEvent(body, sig, secret);
        } else {
            console.warn('[Webhook] No secret/sig, parsing JSON directly');
            event = JSON.parse(body);
        }
    } catch (err: any) {
        console.error('[Webhook] Parse error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.log(`[Webhook] Event: ${event.type}`);

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
        try {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.client_reference_id;
            const customerId = session.customer as string;
            const metadata = session.metadata || {};

            console.log(`[Webhook] userId=${userId}, type=${metadata.type}`);

            if (!userId) {
                return NextResponse.json({ error: 'no_user_id' }, { status: 400 });
            }

            const supabase = getSupabase();

            // Handle ONE-TIME PAYMENT
            if (metadata.type === 'one_time') {
                const credits = parseInt(metadata.credits || '0');
                if (credits > 0) {
                    try {
                        console.log(`[Webhook] Adding ${credits} credits to ${userId} (One-Time)`);
                        await addCredits(supabase, userId, credits, 'purchase', 'One-Time Purchase');
                    } catch (creditError: any) {
                        console.error('[Webhook] Add Credits Error (One-Time):', creditError);
                        // Fail so Stripe retries
                        throw new Error(`Credit addition failed: ${creditError.message}`);
                    }
                }
                return NextResponse.json({ success: true, type: 'one_time' });
            }

            // Handle SUBSCRIPTION START
            // (metadata.type is 'subscription' or undefined for older flows)
            let credits = 0;
            let planName = 'Unknown';
            let periodEnd: string | null = null;
            let priceId = '';

            if (session.subscription) {
                // Expand price.product to access product metadata
                const sub = await stripe.subscriptions.retrieve(session.subscription as string, {
                    expand: ['items.data.price.product']
                }) as any;

                const item = sub.items.data[0];
                const price = item.price;
                const product = price.product;

                priceId = price.id;

                // 1. Try to get Plan Config from Config File (Legacy/Fast path)
                const planConfig = getPlanByPriceId(priceId);

                // 2. Try to get Credits from Metadata (Dynamic/Robust path)
                // Check Price metadata first, then Product metadata
                const metaCredits = price.metadata?.credits || product.metadata?.credits;
                const metaTier = price.metadata?.tier || product.metadata?.tier; // e.g. 'pro', 'elite'

                if (metaCredits) {
                    credits = parseInt(metaCredits);
                    planName = product.name; // Use valid product name from Stripe
                    console.log(`[Webhook] Found explicit credits in Stripe Metadata: ${credits}`);
                } else if (planConfig) {
                    // Fallback to config
                    credits = planConfig.credits;
                    planName = planConfig.name;
                    console.log(`[Webhook] Using config.ts for plan: ${planName}`);
                } else {
                    console.warn(`[Webhook] Plan not found in config AND no metadata.credits found. PriceID: ${priceId}`);
                    // Default to product name if available, even if 0 credits
                    planName = product.name || 'Unknown';
                }

                periodEnd = new Date(sub.current_period_end * 1000).toISOString();
            }

            // Update Profile Status (Plan & Subscription)
            const { error: profileError } = await supabase.from('profiles').update({
                plan: planName,
                subscription_status: 'active',
                subscription_period_end: periodEnd,
                stripe_customer_id: customerId
            }).eq('id', userId);

            if (profileError) {
                console.error('[Webhook] Profile Update Error:', profileError);
                throw new Error(`Profile update failed: ${profileError.message}`);
            }

            // Add Credits (Accumulate)
            if (credits > 0) {
                console.log(`[Webhook] Adding ${credits} credits to ${userId} (Sub Start: ${planName})`);
                try {
                    await addCredits(supabase, userId, credits, 'purchase', `Subscription Started: ${planName}`);
                } catch (creditError: any) {
                    console.error('[Webhook] Add Credits Error (Sub):', creditError);
                    throw new Error(`Credit addition failed: ${creditError.message}`);
                }
            }

            return NextResponse.json({ success: true, type: 'subscription_start' });

        } catch (err: any) {
            console.error('[Webhook] Handler error:', err);
            // Return detailed error to Stripe to help debugging
            return NextResponse.json({
                error: 'Internal Server Error',
                details: err.message,
                stack: err.stack
            }, { status: 500 });
        }
    }

    // Handle invoice.paid (Renewals)
    if (event.type === 'invoice.paid') {
        try {
            const invoice = event.data.object as any;
            if (invoice.billing_reason === 'subscription_create') {
                // Already handled by checkout.session.completed
                return NextResponse.json({ skipped: 'subscription_create' });
            }

            const subId = invoice.subscription;
            if (!subId) return NextResponse.json({ skipped: 'no_sub' });

            // Expand to get metadata
            const sub = await stripe.subscriptions.retrieve(subId, {
                expand: ['items.data.price.product']
            }) as any;

            const item = sub.items.data[0];
            const price = item.price;
            const product = price.product;
            const priceId = price.id;

            const planConfig = getPlanByPriceId(priceId);

            // Resolve User ID (from sub metadata or customer metadata)
            let userId = sub.metadata?.userId;
            if (!userId) {
                const customer = await stripe.customers.retrieve(invoice.customer) as any;
                userId = customer.metadata?.userId;
            }

            // Determine Credits & Plan Name (Dynamic + Fallback)
            let credits = 0;
            let planName = 'Unknown';

            const metaCredits = price.metadata?.credits || product.metadata?.credits;

            if (metaCredits) {
                credits = parseInt(metaCredits);
                planName = product.name;
            } else if (planConfig) {
                credits = planConfig.credits;
                planName = planConfig.name;
            } else {
                planName = product.name || 'Unknown';
            }

            if (userId) {
                // Update Period
                const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
                const supabase = getSupabase();

                const { error: profileError } = await supabase.from('profiles').update({
                    plan: planName, // Update in case they upgraded/changed
                    subscription_status: 'active',
                    subscription_period_end: periodEnd,
                    updated_at: new Date().toISOString() // Ensure updated_at is touched
                }).eq('id', userId);

                if (profileError) console.error('[Webhook Renewal] Profile update failed:', profileError);

                // Add Credits
                if (credits > 0) {
                    console.log(`[Webhook] Renewing ${credits} credits for ${userId} (${planName})`);
                    try {
                        await addCredits(supabase, userId, credits, 'subscription_refill', `Subscription Renewal: ${planName}`);
                    } catch (err: any) {
                        console.error('[WebhookRenewal] Credit add failed:', err);
                    }
                }

                return NextResponse.json({ success: true, type: 'renewal', credits });
            } else {
                console.warn('[Webhook] No userId found for renewal invoice:', invoice.id);
                return NextResponse.json({ warning: 'no_user_id' });
            }

        } catch (err: any) {
            console.error('[Webhook] Renewal Error:', err);
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}
