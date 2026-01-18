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
        const profileEmail = (profile?.email || '').toLowerCase().trim();
        const currentDBPlan = (profile?.plan || 'free').toLowerCase();
        let existingSubscription = null;

        console.log(`[STRIKE_SEARCH] User: ${userId} | DB Plan: ${currentDBPlan} | Emails: [${authEmail}, ${profileEmail}]`);

        // 2. SEARCH STRATEGY FOR SUBSCRIPTIONS (Super Robust)
        const customersToSearch = new Set<string>();
        if (customerId) customersToSearch.add(customerId);
        if (bodyCustomerId) customersToSearch.add(bodyCustomerId);

        // Search by both emails to find records
        for (const e of [authEmail, profileEmail]) {
            if (e && e.length > 3) {
                const byEmail = await stripe.customers.list({ email: e, limit: 10 });
                console.log(`[STRIKE_SEARCH] Customers found for email ${e}: ${byEmail.data.length}`);
                byEmail.data.forEach(c => customersToSearch.add(c.id));
            }
        }

        // Search by metadata userId
        const byMeta = await stripe.customers.search({
            query: `metadata['userId']:'${userId}'`,
            limit: 5
        });
        console.log(`[STRIKE_SEARCH] Customers found by metadata userId: ${byMeta.data.length}`);
        byMeta.data.forEach(c => customersToSearch.add(c.id));

        console.log(`[STRIKE_SEARCH] Deep scanning ${customersToSearch.size} unique customers: ${Array.from(customersToSearch).join(', ')}`);

        // Scan ALL customers for subscriptions
        for (const cId of Array.from(customersToSearch)) {
            try {
                const subs = await stripe.subscriptions.list({
                    customer: cId as string,
                    status: 'all',
                    limit: 20,
                    expand: ['data.items.data.price'],
                });

                console.log(`[STRIKE_SEARCH] Subscriptions for ${cId}: ${subs.data.length}`);
                const active = subs.data.find(s => ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status));

                if (active) {
                    existingSubscription = active;
                    customerId = cId as string;
                    console.log(`[STRIKE_SEARCH] ✅ MATCH FOUND: Sub ${active.id} (Status: ${active.status}) on CUST ${cId}`);
                    break;
                }
            } catch (e) { console.error(`[STRIKE_SEARCH] Error scanning customer ${cId}:`, e); }
        }

        // --- EMERGENCY BROAD SCAN IF USER IS SUPPOSED TO BE PAID ---
        if (!existingSubscription && currentDBPlan !== 'free') {
            console.log(`[STRIKE_SEARCH] ⚠️ ALERT: User is ${currentDBPlan} in DB but no sub found yet. STARTING NUCLEAR SCAN.`);
            try {
                // Fetch the 100 most recent active/trialing/past_due subs in the whole account
                const allSubs = await stripe.subscriptions.list({
                    status: 'all',
                    limit: 100,
                    expand: ['data.customer', 'data.items.data.price']
                });

                console.log(`[STRIKE_SEARCH] Nuclear scan checking ${allSubs.data.length} subs...`);

                const found = allSubs.data.find((s: any) => {
                    const c = s.customer;
                    if (!c || typeof c === 'string') return false;

                    const emailMatch = (c.email && (c.email.toLowerCase() === authEmail || c.email.toLowerCase() === profileEmail));
                    const metaMatch = (c.metadata && c.metadata.userId === userId);
                    const isLive = ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status);

                    return (emailMatch || metaMatch) && isLive;
                });

                if (found) {
                    existingSubscription = found;
                    customerId = (found.customer as any).id;
                    console.log(`[STRIKE_SEARCH] ☢️ NUCLEAR MATCH: Found sub ${found.id} on ${customerId}`);
                }
            } catch (e) { console.error('[STRIKE_SEARCH] Nuclear scan failed:', e); }
        }

        // --- VERIFY CUSTOMER EXISTENCE ---
        if (customerId) {
            try {
                await stripe.customers.retrieve(customerId);
            } catch (e: any) {
                if (e.message?.includes('No such customer')) {
                    console.log(`[API] Customer ${customerId} not found in Stripe. Resetting.`);
                    // If the invalid ID was the one in the profile, clear it in DB
                    if (customerId === profile?.stripe_customer_id) {
                        await adminSupabase.from('profiles').update({ stripe_customer_id: null }).eq('id', userId);
                    }
                    customerId = null;
                }
            }
        }

        // Create customer if absolutely none found or invalid (WE MUST HAVE A CUSTOMER ID HERE)
        if (!customerId) {
            console.log(`[STRIKE_SEARCH] No valid customer found. Creating new one for ${authEmail}`);
            try {
                const newCust = await stripe.customers.create({ email: authEmail, metadata: { userId: userId } });
                customerId = newCust.id;
                await adminSupabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
            } catch (e) {
                console.error('[API] Customer creation failed:', e);
            }
        }

        // --- SYNC CUSTOMER ID IF VALID AND DIFFERENT ---
        if (customerId && customerId !== profile?.stripe_customer_id) {
            await adminSupabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        // --- GUARD FOR PAID USERS (PREVENT DUPLICATE CHECKOUT) ---
        // If user is already on a paid plan in our DB, we SHOULD NOT show them a new Checkout screen.
        // We either found a sub (existingSubscription) or we send them to the portal to manage it.
        const isCurrentlyPaid = profile?.plan && profile.plan.toLowerCase() !== 'free';
        if (!existingSubscription && isCurrentlyPaid && priceId !== 'manage') {
            console.log(`[API] 🛡️ GUARD TRIGGERED: User is ${profile.plan} in DB but no sub found in Stripe. Redirecting to Portal instead of Checkout.`);
            try {
                const portal = await stripe.billingPortal.sessions.create({ customer: customerId as string, return_url: successUrl });
                return NextResponse.json({ url: portal.url });
            } catch (e: any) {
                console.error('[API] Guard Portal Session Error:', e);
                // If portal fails too, we still refuse checkout and return error
                return NextResponse.json({ error: 'Your account is already on a paid plan. Please use the Billing Portal to change plans.' }, { status: 400 });
            }
        }

        // 4. ACTION ROUTING
        if (priceId === 'manage') {
            try {
                const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: successUrl });
                return NextResponse.json({ url: session.url });
            } catch (e: any) {
                console.error('[API] Manage Portal Error:', e);
                return NextResponse.json({ error: 'Could not open billing portal. Please try again.' }, { status: 400 });
            }
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
