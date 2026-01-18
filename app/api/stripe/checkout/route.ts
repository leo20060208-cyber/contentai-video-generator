import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { STRIPE_PLANS } from '@/lib/stripe/config';

export const runtime = 'nodejs';

// Initialize Stripe
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

        // 1. Get Customer Logic
        // We reuse the initialized supabase client or create an admin one if needed for reading profile?
        // Reading profile is usually safe with user token if RLS allows 'select own'.
        // But for updating profile (stripe_customer_id), we might need admin key or RLS allowing update.
        // Let's assume user can update their own profile or we use Service Role for ID saving.
        // For safety, let's use Service Role for the backend profile operations like fetching stripe_id.

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey!);

        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        let customerId = profile?.stripe_customer_id;
        let existingSubscription = null;

        // --- 1. DEEP SEARCH STRATEGY ---
        // We look for any customer/subscription associated with the user's email
        // since test accounts often have duplicate customer objects.
        const searchEmail = userEmail || user.email;
        const allCustomersForEmail = await stripe.customers.list({
            email: searchEmail,
            limit: 20, // Check up to 20 potential customer objects
        });

        console.log(`[API] Starting deep subscription search for: ${searchEmail}`);

        if (allCustomersForEmail.data.length > 0) {
            // Check EACH customer record for any subscription that isn't canceled
            for (const cust of allCustomersForEmail.data) {
                const subs = await stripe.subscriptions.list({
                    customer: cust.id,
                    status: 'all', // Get all statuses to filter in code
                    limit: 10,
                    expand: ['data.default_payment_method', 'data.items.data.price'],
                });

                const foundSub = subs.data.find(sub =>
                    ['active', 'trialing', 'past_due', 'incomplete'].includes(sub.status)
                );

                if (foundSub) {
                    customerId = cust.id;
                    existingSubscription = foundSub;
                    console.log(`[API] SUCCESS: Found active/pending subscription ${foundSub.id} on customer ${cust.id} (Status: ${foundSub.status})`);
                    break;
                }
            }
        }

        // If we didn't find an active sub but have customers, use the one from DB or the first found
        if (!customerId && allCustomersForEmail.data.length > 0) {
            customerId = profile?.stripe_customer_id || allCustomersForEmail.data[0].id;
            console.log(`[API] No active sub found, using fallback customer: ${customerId}`);
        }

        // 1.1 Create customer if absolutely none found in Stripe
        if (!customerId) {
            console.log(`[API] Creating brand new customer for email: ${searchEmail}`);
            const customer = await stripe.customers.create({
                email: searchEmail,
                metadata: { userId: userId },
            });
            customerId = customer.id;
        }

        // 1.2 Sync back to database to keep things consistent
        if (customerId !== profile?.stripe_customer_id) {
            console.log(`[API] Syncing customerId ${customerId} back to Supabase for ${userId}`);
            await adminSupabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        // 1.5 Special 'manage' priceId for Billing Portal
        if (priceId === 'manage') {
            console.log(`[API] Manage portal requested for customer: ${customerId}`);
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: successUrl,
            });
            return NextResponse.json({ url: portalSession.url });
        }

        // Verify target
        const targetPriceId = priceId;
        console.log(`[API] Final Result -> Customer: ${customerId}, Found Sub: ${existingSubscription?.id || 'NONE'}`);

        // 3. Flow Routing
        if (existingSubscription && targetPriceId !== 'manage') {
            // --- UPDATING EXISTING SUBSCRIPTION ---
            // If they are trying to buy the SAME plan they already have, just send to portal
            const currentPriceId = existingSubscription.items.data[0].price.id;

            if (currentPriceId === targetPriceId) {
                console.log(`[API] Same plan selected (${currentPriceId}). Redirecting to billing portal.`);
                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: successUrl,
                });
                return NextResponse.json({ url: portalSession.url });
            }

            // For any other change (upgrade or downgrade), use the Portal Update flow
            console.log(`[API] Plan change: ${currentPriceId} -> ${targetPriceId}. Redirecting to Portal Update Flow.`);

            try {
                // IMPORTANT: We use subscription_update flow to show the Stripe hosted plan change UI
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
                console.error('[API] Portal Update Flow failed, falling back to general portal:', e);
                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: successUrl,
                });
                return NextResponse.json({ url: portalSession.url });
            }

        } else {
            // --- NEW SUBSCRIPTION / ONE TIME PAYMENT ---
            console.log(`[API] No existing subscription for customer ${customerId}. Creating new checkout session for ${targetPriceId}.`);
            const mode = body.mode || 'subscription';

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: targetPriceId,
                        quantity: 1,
                    }
                ],
                mode: mode,
                success_url: successUrl,
                cancel_url: cancelUrlFinal,
                customer: customerId,
                client_reference_id: userId,
                metadata: {
                    userId: userId,
                    planName: planName,
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
