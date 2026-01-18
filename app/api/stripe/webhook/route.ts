import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getPlanByPriceId } from '@/lib/stripe/config';

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

            // Get userId - client_reference_id is THE reliable source
            const userId = session.client_reference_id;
            const customerId = session.customer as string;

            console.log(`[Webhook] userId=${userId}, customerId=${customerId}`);

            if (!userId) {
                console.error('[Webhook] NO userId!');
                return NextResponse.json({ error: 'no_user_id' }, { status: 400 });
            }

            // Get subscription details
            let credits = 0;
            let planName = 'Unknown';
            let periodEnd: string | null = null;

            if (session.subscription) {
                const sub = await stripe.subscriptions.retrieve(session.subscription as string) as any;
                const priceId = sub.items.data[0].price.id;
                const planConfig = getPlanByPriceId(priceId);

                credits = planConfig?.credits || 0;
                planName = planConfig?.name || 'Unknown';
                periodEnd = new Date(sub.current_period_end * 1000).toISOString();

                console.log(`[Webhook] Plan: ${planName}, Credits: ${credits}`);
            }

            // UPDATE PROFILE
            const supabase = getSupabase();

            const updateData: any = {
                credits: credits,
                plan: planName,
                subscription_status: 'active',
                stripe_customer_id: customerId,
            };

            if (periodEnd) {
                updateData.subscription_period_end = periodEnd;
            }

            console.log(`[Webhook] Updating profile ${userId}:`, updateData);

            const { data, error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId)
                .select();

            if (error) {
                console.error('[Webhook] UPDATE ERROR:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            console.log(`[Webhook] ✅ SUCCESS! Updated:`, data);
            return NextResponse.json({ success: true, updated: data });

        } catch (err: any) {
            console.error('[Webhook] Handler error:', err);
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
    }

    // Handle invoice.paid (renewals)
    if (event.type === 'invoice.paid') {
        try {
            const invoice = event.data.object as any;
            const subId = invoice.subscription;

            if (!subId) {
                return NextResponse.json({ skipped: 'no_subscription' });
            }

            const sub = await stripe.subscriptions.retrieve(subId) as any;
            const priceId = sub.items.data[0].price.id;
            const planConfig = getPlanByPriceId(priceId);

            // Try to get userId from subscription metadata
            let userId = sub.metadata?.userId;

            // Fallback: check line items
            if (!userId && sub.items?.data?.[0]?.metadata?.userId) {
                userId = sub.items.data[0].metadata.userId;
            }

            // Fallback: check customer metadata
            if (!userId) {
                const customer = await stripe.customers.retrieve(invoice.customer) as any;
                userId = customer.metadata?.userId;
            }

            if (!userId || !planConfig) {
                console.log(`[Webhook] invoice.paid skipped: userId=${userId}, plan=${planConfig?.name}`);
                return NextResponse.json({ skipped: 'missing_data' });
            }

            const supabase = getSupabase();

            const { error } = await supabase
                .from('profiles')
                .update({
                    credits: planConfig.credits,
                    plan: planConfig.name,
                    subscription_status: 'active',
                    subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                })
                .eq('id', userId);

            if (error) {
                console.error('[Webhook] invoice.paid update error:', error);
            } else {
                console.log(`[Webhook] ✅ Renewed ${userId} with ${planConfig.credits} credits`);
            }

        } catch (err: any) {
            console.error('[Webhook] invoice.paid error:', err);
        }
    }

    // Handle subscription deleted
    if (event.type === 'customer.subscription.deleted') {
        try {
            const sub = event.data.object as any;
            const userId = sub.metadata?.userId;

            if (userId) {
                const supabase = getSupabase();
                await supabase
                    .from('profiles')
                    .update({ subscription_status: 'inactive' })
                    .eq('id', userId);

                console.log(`[Webhook] ✅ Subscription cancelled for ${userId}`);
            }
        } catch (err: any) {
            console.error('[Webhook] subscription.deleted error:', err);
        }
    }

    return NextResponse.json({ received: true });
}
