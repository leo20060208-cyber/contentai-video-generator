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
            // HARDCODED credit values by product name - this is the SOURCE OF TRUTH
            const CREDITS_BY_PRODUCT_NAME: Record<string, number> = {
                'Starter': 400,
                'Pro': 875,
                'Elite': 1600,
                // Fallbacks for variations
                'starter': 400,
                'pro': 875,
                'elite': 1600,
            };

            let credits = 0;
            let planName = 'Unknown';
            let periodEnd: string | null = null;

            console.log(`[Webhook] session.subscription: ${session.subscription || 'null'}`);

            if (session.subscription) {
                // Get subscription details from Stripe
                const sub = await stripe.subscriptions.retrieve(session.subscription as string, {
                    expand: ['items.data.price.product']
                }) as any;

                const item = sub.items.data[0];
                const price = item.price;
                const product = price.product;
                const productName = product.name;

                console.log(`[Webhook] Product name from Stripe: "${productName}"`);

                // Get credits directly from product name - NO METADATA NEEDED
                planName = productName;
                credits = CREDITS_BY_PRODUCT_NAME[productName] || 0;

                // If still 0, try case-insensitive match
                if (credits === 0) {
                    const lowerName = productName.toLowerCase();
                    if (lowerName.includes('starter')) credits = 400;
                    else if (lowerName.includes('elite')) credits = 1600;
                    else if (lowerName.includes('pro')) credits = 875;
                }

                console.log(`[Webhook] Credits resolved: ${credits} for plan "${planName}"`);
                periodEnd = new Date(sub.current_period_end * 1000).toISOString();
            } else {
                // Fallback: get from session metadata
                console.warn(`[Webhook] No subscription in session, using metadata fallback`);
                planName = metadata.planName || 'Unknown';
                credits = parseInt(metadata.credits || '0');
            }

            console.log(`[Webhook] Before profile update - credits: ${credits}, planName: ${planName}`);

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
                    console.log(`[Webhook] SUCCESS: ${credits} credits added to user ${userId}`);
                } catch (creditError: any) {
                    console.error('[Webhook] Add Credits Error (Sub):', creditError);
                    throw new Error(`Credit addition failed: ${creditError.message}`);
                }
            } else {
                console.warn(`[Webhook] WARNING: credits is ${credits}, skipping credit addition!`);
            }

            console.log(`[Webhook] checkout.session.completed finished for user ${userId}`);
            return NextResponse.json({ success: true, type: 'subscription_start', credits_added: credits });

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
            const productName = product.name;

            // HARDCODED credit values - same as checkout handler
            const CREDITS_BY_PRODUCT_NAME: Record<string, number> = {
                'Starter': 400, 'Pro': 875, 'Elite': 1600,
                'starter': 400, 'pro': 875, 'elite': 1600,
            };

            // Resolve User ID (from sub metadata or customer metadata)
            let userId = sub.metadata?.userId;
            if (!userId) {
                const customer = await stripe.customers.retrieve(invoice.customer) as any;
                userId = customer.metadata?.userId;
            }

            // Get credits directly from product name
            let credits = CREDITS_BY_PRODUCT_NAME[productName] || 0;
            let planName = productName || 'Unknown';

            // Case-insensitive fallback
            if (credits === 0 && productName) {
                const lowerName = productName.toLowerCase();
                if (lowerName.includes('starter')) credits = 400;
                else if (lowerName.includes('elite')) credits = 1600;
                else if (lowerName.includes('pro')) credits = 875;
            }

            console.log(`[Webhook Renewal] Product: "${productName}", Credits: ${credits}`);

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

    // Handle customer.subscription.updated (Plan Changes / Cancellations)
    if (event.type === 'customer.subscription.updated') {
        const sub = event.data.object as any;
        console.log(`[Webhook] Subscription Updated: ${sub.id}, status=${sub.status}`);

        // HARDCODED credit values
        const CREDITS_BY_PRODUCT_NAME: Record<string, number> = {
            'Starter': 400, 'Pro': 875, 'Elite': 1600,
            'starter': 400, 'pro': 875, 'elite': 1600,
        };

        let userId = sub.metadata?.userId;
        if (!userId) {
            try {
                const customer = await stripe.customers.retrieve(sub.customer as string) as any;
                userId = customer.metadata?.userId;
            } catch (e) { console.warn('Could not fetch customer for userId', e); }
        }

        if (userId) {
            const supabase = getSupabase();

            // Check if it's a cancellation
            if (sub.cancel_at_period_end) {
                console.log(`[Webhook] User ${userId} canceled subscription (at period end)`);
                await supabase.from('profiles').update({
                    subscription_status: 'canceling',
                    updated_at: new Date().toISOString()
                }).eq('id', userId);
            } else {
                // Plan change (Upgrade/Downgrade) - fetch full subscription to get product name
                try {
                    const fullSub = await stripe.subscriptions.retrieve(sub.id, {
                        expand: ['items.data.price.product']
                    });
                    const product = (fullSub.items.data[0].price.product as any);
                    const productName = product.name;

                    // Get credits from product name
                    let credits = CREDITS_BY_PRODUCT_NAME[productName] || 0;
                    if (credits === 0 && productName) {
                        const lowerName = productName.toLowerCase();
                        if (lowerName.includes('starter')) credits = 400;
                        else if (lowerName.includes('elite')) credits = 1600;
                        else if (lowerName.includes('pro')) credits = 875;
                    }

                    console.log(`[Webhook] Plan change to ${productName} with ${credits} credits for user ${userId}`);

                    // Update profile
                    await supabase.from('profiles').update({
                        plan: productName,
                        subscription_status: sub.status,
                        subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                        updated_at: new Date().toISOString()
                    }).eq('id', userId);

                    // ADD CREDITS on plan change (upgrade)
                    if (credits > 0) {
                        console.log(`[Webhook] Adding ${credits} credits for plan upgrade to ${productName}`);
                        await addCredits(supabase, userId, credits, 'purchase', `Plan Changed to: ${productName}`);
                    }
                } catch (e) {
                    console.error('[Webhook] Error processing subscription update:', e);
                }
            }
            return NextResponse.json({ success: true, type: 'subscription_updated' });
        }
        return NextResponse.json({ warning: 'no_user_id_updated' });
    }

    // Handle customer.subscription.deleted (Final Cancellation)
    if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object as any;
        console.log(`[Webhook] Subscription Deleted: ${sub.id}`);

        let userId = sub.metadata?.userId;
        if (!userId) {
            try {
                const customer = await stripe.customers.retrieve(sub.customer as string) as any;
                userId = customer.metadata?.userId;
            } catch (e) { }
        }

        if (userId) {
            const supabase = getSupabase();
            await supabase.from('profiles').update({
                plan: 'Free', // Revert to Free? Or leave plan name but status canceled?
                subscription_status: 'canceled',
                subscription_period_end: null, // Or keep last date
                updated_at: new Date().toISOString()
            }).eq('id', userId);

            console.log(`[Webhook] User ${userId} subscription marked canceled.`);
            return NextResponse.json({ success: true, type: 'subscription_deleted' });
        }
        return NextResponse.json({ warning: 'no_user_id_deleted' });
    }

    return NextResponse.json({ received: true });
}
