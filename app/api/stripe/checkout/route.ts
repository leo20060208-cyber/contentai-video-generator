import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            priceId,
            credits,
            successUrl: successUrlCamel,
            success_url: success_url_underscore,
            cancel_url,
            cancelUrl,
            returnUrl,
            planName,
            userEmail,
            stripe_customer_id: bodyCustomerId
        } = body;

        const successUrl = success_url_underscore || successUrlCamel || returnUrl || `${req.headers.get('origin')}/profile`;
        const cancelUrlFinal = cancel_url || cancelUrl || successUrl || `${req.headers.get('origin')}/pricing`;

        // 1. Auth check
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = user.id;
        const email = (userEmail || user.email || '').toLowerCase().trim();

        // 2. Fetch Profile to get stripe_customer_id
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey!);
        const { data: profile } = await adminSupabase.from('profiles').select('*').eq('id', userId).single();

        let customerId = bodyCustomerId || profile?.stripe_customer_id;
        let existingSubscription = null;

        // 3. SEARCH STRATEGY FOR SUBSCRIPTIONS (Super Robust)
        const customersToSearch = new Set<string>();
        if (customerId) customersToSearch.add(customerId);

        // Search by email to find ALL records (sometimes Stripe creates duplicates)
        if (email) {
            const byEmail = await stripe.customers.list({ email: email, limit: 15 });
            byEmail.data.forEach(c => customersToSearch.add(c.id));
        }

        // Search by metadata userId
        const byMeta = await stripe.customers.search({
            query: `metadata['userId']:'${userId}'`,
            limit: 5
        });
        byMeta.data.forEach(c => customersToSearch.add(c.id));

        console.log(`[API] Deep scanning ${customersToSearch.size} customer records for ${email}`);

        // Scrutinize every customer for any active/trialing/past_due subscription
        for (const cId of Array.from(customersToSearch)) {
            try {
                const subs = await stripe.subscriptions.list({
                    customer: cId as string,
                    status: 'all',
                    limit: 10,
                    expand: ['data.items.data.price'],
                });

                // Identify ANY subscription that isn't canceled or complete_expired
                const active = subs.data.find(s => ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status));

                if (active) {
                    existingSubscription = active;
                    customerId = cId as string;
                    console.log(`[API] FOUND ACTIVE SUB ${active.id} on customer ${cId}`);
                    break;
                }
            } catch (e) {
                console.error(`[API] Sub retrieval error for ${cId}:`, e);
            }
        }

        // --- EMERGENCY BROAD SCAN ---
        if (!existingSubscription && profile?.plan !== 'free') {
            try {
                const broad = await stripe.subscriptions.list({ status: 'active', limit: 80, expand: ['data.customer'] });
                const found = broad.data.find((s: any) =>
                    (s.customer && s.customer.email === email) ||
                    (s.customer && s.customer.metadata?.userId === userId)
                );
                if (found) {
                    existingSubscription = found;
                    customerId = typeof found.customer === 'string' ? found.customer : found.customer.id;
                }
            } catch (e) { console.error('[API] Broad scan failed', e); }
        }

        // Sync customer ID if found/different
        if (customerId && customerId !== profile?.stripe_customer_id) {
            await adminSupabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        // Create customer if absolutely none found
        if (!customerId) {
            const newCust = await stripe.customers.create({ email: email, metadata: { userId: userId } });
            customerId = newCust.id;
        }

        // 4. ACTION ROUTING
        if (priceId === 'manage') {
            const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: successUrl });
            return NextResponse.json({ url: session.url });
        }

        // FOR SUBSCRIBERS: Handle Plan Changes via Portal
        if (existingSubscription) {
            const currentPrice = existingSubscription.items.data[0].price.id;

            // If same plan, just go to manage portal
            if (currentPrice === priceId) {
                const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: successUrl });
                return NextResponse.json({ url: session.url });
            }

            // Redirect to Portal Update Flow (Handled by Stripe UI)
            console.log(`[API] Triggering Portal Plan Change for ${customerId}: ${currentPrice} -> ${priceId}`);
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: successUrl,
                flow_data: {
                    type: 'subscription_update',
                    subscription_update: { subscription: existingSubscription.id },
                },
            } as any);
            return NextResponse.json({ url: portalSession.url });
        }

        // FOR NEW USERS: Handle Checkout Flow
        console.log(`[API] Triggering NEW Checkout for ${customerId}: ${priceId}`);
        const mode = body.mode || 'subscription';
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
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

    } catch (error: any) {
        console.error('[API] Fatal Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
