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

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userEmail || user.email,
                metadata: { userId: userId },
            });
            customerId = customer.id;

            // Save customer ID using Admin Client to bypass RLS restrictions on this system field
            await adminSupabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        // 1.5 Handle special 'manage' priceId for Billing Portal
        if (priceId === 'manage') {
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: successUrl,
            });
            return NextResponse.json({ url: portalSession.url });
        }

        // 2. Check for Existing Active Subscription
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1,
        });

        const existingSubscription = subscriptions.data.find(sub => sub.status === 'active');
        let session: Stripe.Checkout.Session | null = null;
        const targetPriceId = priceId;

        if (existingSubscription) {
            // --- UPDATING EXISTING SUBSCRIPTION ---
            // Determine if Upgrade (Price Increase) or Downgrade

            const currentPriceItem = existingSubscription.items.data[0];
            const currentPriceObj = currentPriceItem.price;

            // Fetch target price to compare amounts
            const targetPriceObj = await stripe.prices.retrieve(targetPriceId);

            const currentAmount = currentPriceObj.unit_amount || 0;
            const targetAmount = targetPriceObj.unit_amount || 0;
            const isUpgrade = targetAmount > currentAmount;

            console.log(`[API] Processing subscription change. Current: ${currentAmount}, Target: ${targetAmount}. Is Upgrade? ${isUpgrade}`);

            if (isUpgrade) {
                // --- UPGRADE: Use Billing Portal with Update Flow ---
                // User sees confirmation page.
                console.log('[API] Upgrade: Redirecting to Billing Portal');

                try {
                    const portalSession = await stripe.billingPortal.sessions.create({
                        customer: customerId,
                        return_url: successUrl,
                        flow_data: {
                            type: 'subscription_update',
                            subscription_update: {
                                subscription: existingSubscription.id,
                                items: [{
                                    id: currentPriceItem.id,
                                    price: targetPriceId,
                                    quantity: 1,
                                }],
                            },
                        },
                    } as any);
                    return NextResponse.json({ url: portalSession.url });
                } catch (e: any) {
                    console.error('[API] Portal Upgrade Error, falling back to standard portal:', e);
                    const portalSession = await stripe.billingPortal.sessions.create({
                        customer: customerId,
                        return_url: successUrl,
                    });
                    return NextResponse.json({ url: portalSession.url });
                }

            } else {
                // --- DOWNGRADE: Solo redirigimos al portal normal para que Stripe lo gestione ---
                // Stripe Customer Portal maneja los downgrades al final del periodo automáticamente si está configurado.
                console.log('[API] Downgrade/Same: Redirecting to Portal');
                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: successUrl,
                });
                return NextResponse.json({ url: portalSession.url });
            }

        } else {
            // --- NEW SUBSCRIPTION / ONE TIME PAYMENT ---

            // Determine Mode: If targetPrice is strictly a one-time price (credits), use payment.
            // But usually plans are subscriptions.
            // Logic: Assume Subscription unless 'payment' mode requested or inferred?
            // User passes isMonthly?
            // "Buy Credits" uses this route too?
            // If body.credits and NO planName, maybe it's credits?
            // Let's assume passed 'mode' or default to subscription.

            // Wait, previous code checked `isMonthly`.
            // If `isMonthly` is not passed for credit packs, we assume payment?
            // Actually, plans are always 'subscription'. Credit packs are 'payment'.
            // Simple heuristic to differentiate:
            const mode = body.mode || 'subscription';

            session = await stripe.checkout.sessions.create({
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
