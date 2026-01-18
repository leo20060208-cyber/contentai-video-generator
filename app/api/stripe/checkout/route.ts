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
        const authEmail = (userEmail || user.email || '').toLowerCase().trim();

        // 2. Fetch Profile to get stripe_customer_id
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey!);
        const { data: profile } = await adminSupabase.from('profiles').select('*').eq('id', userId).single();

        let customerId = bodyCustomerId || profile?.stripe_customer_id;
        let existingSubscription = null;
        const profileEmail = (profile?.email || '').toLowerCase().trim();

        // 3. SEARCH STRATEGY FOR SUBSCRIPTIONS (Super Robust)
        const customersToSearch = new Set<string>();
        if (customerId) customersToSearch.add(customerId);

        // Search by both emails to find records
        for (const e of [authEmail, profileEmail]) {
            if (e) {
                const byEmail = await stripe.customers.list({ email: e, limit: 15 });
                byEmail.data.forEach(c => customersToSearch.add(c.id));
            }
        }

        // Search by metadata userId
        const byMeta = await stripe.customers.search({
            query: `metadata['userId']:'${userId}'`,
            limit: 5
        });
        byMeta.data.forEach(c => customersToSearch.add(c.id));

        console.log(`[API] Deep scanning ${customersToSearch.size} customers for user ${userId}`);

        // Scan ALL customers for subscriptions
        for (const cId of Array.from(customersToSearch)) {
            try {
                const subs = await stripe.subscriptions.list({
                    customer: cId as string,
                    status: 'all',
                    limit: 10,
                    expand: ['data.items.data.price'],
                });
                const active = subs.data.find(s => ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status));
                if (active) {
                    existingSubscription = active;
                    customerId = cId as string;
                    console.log(`[API] FOUND SUB ${active.id} on CUST ${cId}`);
                    break;
                }
            } catch (e) { console.error(`[API] Scan error for ${cId}:`, e); }
        }

        // --- EMERGENCY BROAD SCAN IF USER IS SUPPOSED TO BE PAID ---
        if (!existingSubscription && profile?.plan && profile.plan !== 'free') {
            console.log(`[API] EMERGENCY: Paid user (${profile.plan}) missing sub in standard search. BROAD SCANNING.`);
            try {
                const allRecent = await stripe.subscriptions.list({ status: 'all', limit: 100, expand: ['data.customer'] });
                const found = allRecent.data.find((s: any) => {
                    const c = s.customer;
                    if (!c || typeof c === 'string') return false;
                    const match = (c.email && (c.email.toLowerCase() === authEmail || c.email.toLowerCase() === profileEmail)) ||
                        (c.metadata && c.metadata.userId === userId);
                    return match && ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status);
                });
                if (found) {
                    existingSubscription = found;
                    customerId = typeof found.customer === 'string' ? found.customer : (found.customer as any).id;
                    console.log(`[API] BROAD SCAN SUCCESS: Found ${found.id}`);
                }
            } catch (e) { console.error('[API] Broad scan error:', e); }
        }

        // Sync customer ID if found or known
        if (customerId && customerId !== profile?.stripe_customer_id) {
            await adminSupabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        // If STILL no sub found but user is already on a PAID plan in DB, they might be in a sync mismatch.
        // We will REFUSE to create a new checkout and instead send them to the 'manage' portal to fix it.
        const isCurrentlyPaid = profile?.plan && profile.plan.toLowerCase() !== 'free';
        if (!existingSubscription && isCurrentlyPaid && priceId !== 'manage') {
            console.log(`[API] GUARD: User is ${profile.plan} in DB but no sub found in Stripe. Redirecting to billing portal.`);
            const portal = await stripe.billingPortal.sessions.create({ customer: customerId || '', return_url: successUrl });
            return NextResponse.json({ url: portal.url });
        }

        // Create customer if absolutely none found
        if (!customerId) {
            const newCust = await stripe.customers.create({ email: authEmail, metadata: { userId: userId } });
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

            if (currentPrice === priceId) {
                const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: successUrl });
                return NextResponse.json({ url: session.url });
            }

            console.log(`[API] TRIGGERING PORTAL SWITCH: ${currentPrice} -> ${priceId}`);
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
