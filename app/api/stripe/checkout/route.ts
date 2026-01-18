import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getPlanByPriceId, STRIPE_PLANS } from '@/lib/stripe/config';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { priceId, planName, credits } = body;

        const successUrl = body.success_url || body.successUrl || body.returnUrl || `${req.headers.get('origin')}/pricing?success=true`;
        const cancelUrl = body.cancel_url || body.cancelUrl || `${req.headers.get('origin')}/pricing`;

        // 1. AUTHENTICATE USER
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;
        const userEmail = user.email?.toLowerCase().trim() || '';

        // 2. GET OR CREATE STRIPE CUSTOMER
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('[Checkout] SUPABASE_SERVICE_ROLE_KEY not set');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: profile } = await adminSupabase.from('profiles').select('stripe_customer_id, plan').eq('id', userId).single();


        let customerId = profile?.stripe_customer_id;

        // Validate customer exists in Stripe
        if (customerId) {
            try {
                await stripe.customers.retrieve(customerId);
            } catch (e: any) {
                if (e.message?.includes('No such customer')) {
                    customerId = null;
                }
            }
        }

        // Create customer if needed
        if (!customerId) {
            const newCustomer = await stripe.customers.create({
                email: userEmail,
                metadata: { userId: userId }
            });
            customerId = newCustomer.id;
            await adminSupabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        console.log(`[Checkout] User: ${userId}, Customer: ${customerId}, PriceId: ${priceId}`);

        // 3. ROUTE: BILLING PORTAL OR CHECKOUT
        if (priceId === 'manage') {
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: successUrl,
            });
            return NextResponse.json({ url: portalSession.url });
        }

        // Get plan config for credits
        const planConfig = getPlanByPriceId(priceId);

        // 4. CHECK FOR EXISTING SUBSCRIPTION (Critical for plan changes)
        let existingSubscription = null;
        try {
            const subs = await stripe.subscriptions.list({
                customer: customerId,
                status: 'active',
                limit: 5,
                expand: ['data.items.data.price']
            });
            existingSubscription = subs.data[0] || null;

            if (existingSubscription) {
                console.log(`[Checkout] User has active subscription: ${existingSubscription.id}`);
            }
        } catch (e) {
            console.error('[Checkout] Error checking subscriptions:', e);
        }

        // 5. IF SUBSCRIBED: Route to Billing Portal (NOT Checkout!)
        if (existingSubscription) {
            console.log(`[Checkout] Redirecting subscribed user to Billing Portal for plan change`);
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: successUrl,
            });
            return NextResponse.json({ url: portalSession.url });
        }

        // 6. NEW USER: Create Checkout Session
        console.log(`[Checkout] Creating new checkout for unsubscribed user`);
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer: customerId,
            client_reference_id: userId,
            metadata: {
                userId: userId,
                planName: planConfig?.name || planName || '',
                credits: planConfig?.credits?.toString() || credits?.toString() || '0',
            },
            allow_promotion_codes: true,
            subscription_data: {
                metadata: { userId: userId }
            }
        });

        return NextResponse.json({ url: session.url, sessionId: session.id });


    } catch (error: any) {
        console.error('[Checkout] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
