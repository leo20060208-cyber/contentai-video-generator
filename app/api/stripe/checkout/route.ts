import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { STRIPE_PLANS } from '@/lib/stripe/config';

export const runtime = 'nodejs';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            priceId,
            credits,
            isMonthly,
            cancelUrl,
            successUrl: successUrlCamel,
            success_url: success_url_underscore,
            cancel_url,
            returnUrl,
            planName,
            userEmail
        } = body;

        const successUrl = success_url_underscore || successUrlCamel || returnUrl || `${req.headers.get('origin')}/profile`;
        const cancelUrlFinal = cancel_url || cancelUrl || successUrl || `${req.headers.get('origin')}/pricing`;

        // --- AUTHENTICATION & USER RETRIEVAL ---
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: User not found' }, { status: 401 });
        }

        const userId = user.id;

        if (!priceId) {
            return NextResponse.json({ error: 'Missing priceId parameter' }, { status: 400 });
        }

        // --- DATABASE PROFILE LOOKUP ---
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey!);

        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        let customerId = profile?.stripe_customer_id;
        let existingSubscription = null;
        const searchEmail = (userEmail || user.email || '').toLowerCase().trim();

        console.log(`[API] --- AGGRESSIVE SEARCH for ${searchEmail} (${userId}) ---`);

        // 1. COLLECT ALL POTENTIAL CUSTOMERS
        const potentialCustomers = new Set<string>();
        if (customerId) potentialCustomers.add(customerId);

        try {
            // Search by Email
            const customersByEmail = await stripe.customers.list({ email: searchEmail, limit: 10 });
            customersByEmail.data.forEach(c => potentialCustomers.add(c.id));

            // Search by Metadata
            const customersByMeta = await stripe.customers.search({
                query: `metadata['userId']:'${userId}'`,
                limit: 5,
            });
            customersByMeta.data.forEach(c => potentialCustomers.add(c.id));
        } catch (e) {
            console.error('[API] Customer search error:', e);
        }

        console.log(`[API] Found ${potentialCustomers.size} potential customer records:`, Array.from(potentialCustomers));

        // 2. SCAN FOR ANY ACTIVE/PENDING SUBSCRIPTION
        for (const custId of potentialCustomers) {
            try {
                const subs = await stripe.subscriptions.list({
                    customer: custId,
                    status: 'all',
                    limit: 10,
                    expand: ['data.items.data.price'],
                });

                // Find ANY subscription that isn't canceled or incomplete_expired
                const validSub = subs.data.find(sub =>
                    ['active', 'trialing', 'past_due', 'incomplete'].includes(sub.status)
                );

                if (validSub) {
                    customerId = custId;
                    existingSubscription = validSub;
                    console.log(`[API] Found valid subscription ${validSub.id} on customer ${custId} (Status: ${validSub.status})`);
                    break;
                }
            } catch (e) {
                console.error(`[API] Error listing subs for ${custId}:`, e);
            }
        }

        // 3. SELECTION & FALLBACK
        if (!customerId && potentialCustomers.size > 0) {
            customerId = Array.from(potentialCustomers)[0];
        }

        if (!customerId) {
            console.log(`[API] Creating brand new customer for ${searchEmail}`);
            const newCust = await stripe.customers.create({ email: searchEmail, metadata: { userId: userId } });
            customerId = newCust.id;
        }

        // Sync back to DB if needed
        if (customerId !== profile?.stripe_customer_id) {
            await adminSupabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        // 4. ACTION ROUTING
        const targetPriceId = priceId;

        // Manage Portal Requested
        if (targetPriceId === 'manage') {
            const portalSession = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: successUrl });
            return NextResponse.json({ url: portalSession.url });
        }

        // Plan Change (Update) Flow
        if (existingSubscription) {
            const currentPriceId = existingSubscription.items.data[0].price.id;
            console.log(`[API] Existing Sub found (${existingSubscription.id}). Target Price: ${targetPriceId}. Current: ${currentPriceId}`);

            try {
                // If same plan, just go to general portal
                if (currentPriceId === targetPriceId) {
                    const portalSession = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: successUrl });
                    return NextResponse.json({ url: portalSession.url });
                }

                // Force a Subscription Update flow in the billing portal
                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: successUrl,
                    flow_data: {
                        type: 'subscription_update',
                        subscription_update: {
                            subscription: existingSubscription.id,
                            items: [{
                                id: existingSubscription.items.data[0].id,
                                price: targetPriceId,
                                quantity: 1,
                            }],
                        },
                    },
                } as any);
                return NextResponse.json({ url: portalSession.url });
            } catch (e: any) {
                console.error('[API] Specialized Portal Flow failed, using fallback:', e);
                const portalSession = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: successUrl });
                return NextResponse.json({ url: portalSession.url });
            }
        } else {
            // New Subscription Checkout Flow
            const mode = body.mode || 'subscription';
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{ price: targetPriceId, quantity: 1 }],
                mode: mode as any,
                success_url: successUrl,
                cancel_url: cancelUrlFinal,
                customer: customerId,
                client_reference_id: userId,
                metadata: {
                    userId: userId,
                    planName: planName || '',
                    credits: credits?.toString() || '0',
                    type: mode === 'subscription' ? 'subscription_creation' : 'credit_purchase'
                },
                allow_promotion_codes: true,
            });

            return NextResponse.json({ sessionId: session.id, url: session.url });
        }

    } catch (error: any) {
        console.error('[API] Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
