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
        const dbPlan = (profile?.plan || 'free').toLowerCase();
        const dbStatus = (profile?.subscription_status || 'inactive').toLowerCase();
        const isLikelySubscribed = dbPlan !== 'free' || dbStatus === 'active' || dbStatus === 'trialing';

        let existingSubscription = null;

        console.log(`[STRIKE_SEARCH] User: ${userId} | DB Plan: ${dbPlan}/${dbStatus} | Emails: [${authEmail}, ${profileEmail}]`);

        // 2. SEARCH STRATEGY FOR SUBSCRIPTIONS (Super Robust)
        const customersToSearch = new Set<string>();
        if (customerId) customersToSearch.add(customerId);
        if (bodyCustomerId) customersToSearch.add(bodyCustomerId);

        const emailQueries = [];
        if (authEmail) emailQueries.push(`email:'${authEmail}'`);
        if (profileEmail && profileEmail !== authEmail) emailQueries.push(`email:'${profileEmail}'`);

        // Search Customers by Query (Search API)
        try {
            const query = [...emailQueries, `metadata['userId']:'${userId}'`].join(' OR ');
            const searchResults = await stripe.customers.search({ query, limit: 20 });
            searchResults.data.forEach(c => customersToSearch.add(c.id));
            console.log(`[STRIKE_SEARCH] Search API found ${searchResults.data.length} customers.`);
        } catch (e) {
            console.error('[STRIKE_SEARCH] Customer search failed:', e);
        }

        // Search Customers by List (List API fallback/supplement)
        for (const e of [authEmail, profileEmail]) {
            if (e && e.length > 3) {
                try {
                    const listResults = await stripe.customers.list({ email: e, limit: 10 });
                    listResults.data.forEach(c => customersToSearch.add(c.id));
                } catch (e) { console.error(`[STRIKE_SEARCH] List by email ${e} failed:`, e); }
            }
        }

        console.log(`[STRIKE_SEARCH] Final candidate list (${customersToSearch.size}): ${Array.from(customersToSearch).join(', ')}`);

        // Scan EVERY customer for a live subscription
        let foundAnySub = false;
        const allCandidates = Array.from(customersToSearch);
        for (const cId of allCandidates) {
            try {
                const subs = await stripe.subscriptions.list({
                    customer: cId as string,
                    status: 'all',
                    limit: 10,
                    expand: ['data.items.data.price'],
                });

                console.log(`[STRIKE_SEARCH] Checking CUST ${cId}: Found ${subs.data.length} subs.`);
                if (subs.data.length > 0) foundAnySub = true;

                // Find any "live" subscription
                const liveSub = subs.data.find(s => ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status));

                if (liveSub) {
                    existingSubscription = liveSub;
                    customerId = cId as string; // THIS IS THE ONE!
                    console.log(`[STRIKE_SEARCH] ✅ LIVE SUB MATCH: ${liveSub.id} (Status: ${liveSub.status}) on CUST ${cId}`);
                    break; // Stop looking, we found the active one
                }
            } catch (e) { console.error(`[STRIKE_SEARCH] Error scanning customer ${cId}:`, e); }
        }

        // --- NUCLEAR SCAN (LAST RESORT) ---
        if (!existingSubscription && isLikelySubscribed) {
            console.log(`[STRIKE_SEARCH] ☢️ NUCLEAR SCAN: User marked ${dbPlan}/${dbStatus} in DB but no sub found in candidate customers. Searching ALL subs in account...`);
            try {
                const allSubs = await stripe.subscriptions.list({
                    status: 'all',
                    limit: 100,
                    expand: ['data.customer', 'data.items.data.price']
                });

                const match = allSubs.data.find((s: any) => {
                    const c = s.customer;
                    if (!c || typeof c === 'string') return false;
                    const eMatch = (c.email && (c.email.toLowerCase() === authEmail || c.email.toLowerCase() === profileEmail));
                    const mMatch = (c.metadata && c.metadata.userId === userId);
                    return (eMatch || mMatch) && ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status);
                });

                if (match) {
                    existingSubscription = match;
                    customerId = (match.customer as any).id;
                    console.log(`[STRIKE_SEARCH] ☢️ NUCLEAR MATCH: Found ${match.id} on ${customerId}`);
                }
            } catch (e) { console.error('[STRIKE_SEARCH] Nuclear scan failed:', e); }
        }

        // --- NO SUB FOUND DIAGNOSTIC ---
        if (!existingSubscription && isLikelySubscribed) {
            console.error(`[STRIKE_SEARCH] ❌ CRITICAL: No subscription found for PAID user ${userId} (${authEmail})`);
            // We won't return yet, we'll let the guard handle it, but we log the hell out of it.
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

        // --- 🛡️ ABSOLUTE GUARD FOR SUBSCRIBED USERS ---
        // If we STILL can't find an active sub but the user is Elite in our DB:
        if (!existingSubscription && isLikelySubscribed && priceId !== 'manage') {
            // SYNC CHECK: If we found ANY sub but none were active, the user likely canceled.
            // In this case, we should EXCEPTIONALLY allow them to checkout again OR send to portal to "re-subscribe".
            if (foundAnySub) {
                console.log(`[API] 🔄 SYNC: User is ${dbPlan} in DB but only inactive subs found in Stripe. Allowing Checkout but updating DB.`);
                await adminSupabase.from('profiles').update({ plan: 'free', subscription_status: 'inactive' }).eq('id', userId);
                // Proceed to checkout as a "free" user
            } else {
                console.log(`[API] 🛡️ GUARD: Paid user missing active sub. Forcing Portal to resolve.`);
                try {
                    const portal = await stripe.billingPortal.sessions.create({ customer: customerId as string, return_url: successUrl });
                    return NextResponse.json({ url: portal.url });
                } catch (e) {
                    console.error('[API] Guard Portal Error:', e);
                }
            }
        }

        // 4. ACTION ROUTING
        if (priceId === 'manage') {
            try {
                const session = await stripe.billingPortal.sessions.create({ customer: customerId as string, return_url: successUrl });
                return NextResponse.json({ url: session.url });
            } catch (e: any) {
                console.error('[API] Manage Portal Error:', e);
                // Last ditch: if manage portal fails (e.g. no customer), create one.
                if (!customerId) {
                    const newCust = await stripe.customers.create({ email: authEmail, metadata: { userId: userId } });
                    customerId = newCust.id;
                    await adminSupabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
                    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: successUrl });
                    return NextResponse.json({ url: session.url });
                }
                return NextResponse.json({ error: 'Could not open billing portal.' }, { status: 400 });
            }
        }

        // FOR SUBSCRIBERS: Handle Plan Changes via Portal (Specific Flow)
        if (existingSubscription) {
            const currentPrice = existingSubscription.items.data[0].price.id;

            if (currentPrice === priceId) {
                const session = await stripe.billingPortal.sessions.create({ customer: customerId as string, return_url: successUrl });
                return NextResponse.json({ url: session.url });
            }

            console.log(`[API] TRIGGERING PORTAL SWITCH: ${currentPrice} -> ${priceId}`);
            try {
                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId as string,
                    return_url: successUrl,
                    flow_data: {
                        type: 'subscription_update',
                        subscription_update: { subscription: existingSubscription.id },
                    },
                } as any);
                return NextResponse.json({ url: portalSession.url });
            } catch (e: any) {
                console.error('[API] Specialized Portal Error, fallback to general:', e);
                const session = await stripe.billingPortal.sessions.create({ customer: customerId as string, return_url: successUrl });
                return NextResponse.json({ url: session.url });
            }
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
