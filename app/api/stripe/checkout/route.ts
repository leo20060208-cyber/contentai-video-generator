import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any }) : null;

// Mock Mode support
// Only use Mock mode in development if key is missing.
// In production, we should probably fail loudly if the key is missing so the admin knows.
const IS_MOCK_MODE = !stripeSecretKey && process.env.NODE_ENV !== 'production';

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
    console.error("CRITICAL: STRIPE_SECRET_KEY is missing in production environment variables. Checkout will fail.");
}

export async function POST(request: Request) {
    try {
        console.log('[API] Stripe Checkout request received');

        // 1. Auth Check using Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // or Service Role if needed, but Auth User is enough
        const supabase = createClient(supabaseUrl, supabaseKey);

        const authHeader = request.headers.get('authorization');
        let userId: string | null = null;
        let userEmail: string | undefined;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                userId = user.id;
                userEmail = user.email;
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { priceId, planName, credits, isMonthly, returnUrl, currency } = body;

        if (!priceId && !credits) {
            return NextResponse.json({ error: 'Missing priceId or credits' }, { status: 400 });
        }

        console.log(`[API] Checkout for User: ${userId}, Plan: ${planName}, Credits: ${credits}`);

        const origin = request.headers.get('origin') || 'http://localhost:3000';

        // Append returnUrl to success/cancel URLs if present
        const returnUrlParam = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
        const successUrl = `${origin}/pricing?success=true&plan=${encodeURIComponent(planName || 'credits')}${returnUrlParam}`;
        const cancelUrl = `${origin}/pricing?canceled=true${returnUrlParam}`;

        // --- MOCK MODE (If no Stripe Key) ---
        if (IS_MOCK_MODE || !stripe) {
            console.warn('[API] Stripe Mock Mode: Simulating checkout session');

            // In a real app, we wouldn't add credits here, we wait for webhook.
            // But for Mock Mode to be useful, let's simulate the webhook effect or just return a dummy URL
            // that the frontend considers "success". 
            // Better: We add credits immediately here ONLY IN MOCK MODE.

            // Add Credits (Mock)
            if (credits > 0) {
                const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
                if (serviceRoleKey) {
                    const adminDb = createClient(supabaseUrl, serviceRoleKey);
                    // Fetch existing
                    const { data: profile } = await adminDb.from('profiles').select('credits').eq('id', userId).single();
                    const newCredits = (profile?.credits || 0) + credits;

                    await adminDb.from('profiles').update({
                        credits: newCredits,
                        plan: planName || 'Pro (Mock)'
                    }).eq('id', userId);
                    console.log(`[API MOCK] Added ${credits} credits to user ${userId}`);
                }
            }

            return NextResponse.json({ url: successUrl });
        }

        // --- REAL STRIPE CHECKOUT ---
        /* 
           Note: We need real Price IDs from Stripe Dashboard in the frontend.
           If the frontend sends "price_H5ggY..." we use it. 
           If it sends abstract concepts like "pro_plan", we map it here (better for security).
           For this MVP, we will assume the frontend sends a valid Price ID OR we construct a one-time price.
        */

        let session;

        let targetPriceId = priceId;

        // If it's a Product ID (prod_), fetch the default price
        if (priceId && priceId.startsWith('prod_')) {
            const product = await stripe.products.retrieve(priceId, { expand: ['default_price'] });
            if (product.default_price) {
                targetPriceId = typeof product.default_price === 'string'
                    ? product.default_price
                    : product.default_price.id;
            } else {
                console.warn(`[API] Product ${priceId} has no default_price`);
            }
        }

        if (targetPriceId && targetPriceId.startsWith('price_')) {
            // Subscription or Defined Price
            session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: targetPriceId,
                        quantity: 1,
                    },
                ],
                mode: isMonthly ? 'subscription' : 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: userEmail,
                metadata: {
                    userId: userId,
                    credits: credits ? String(credits) : '0',
                    planName: planName
                },
                allow_promotion_codes: true,
            });
        } else {
            // One-time payment with dynamic price (Simplest for "Buy 100 Credits")
            session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: currency || 'usd',
                            product_data: {
                                name: planName || `${credits} Credits`,
                                description: `Add ${credits} credits to your account`,
                            },
                            unit_amount: body.amount ? Math.round(body.amount * 100) : 1000, // cents
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: userEmail,
                metadata: {
                    userId: userId,
                    credits: credits ? String(credits) : '0',
                },
                allow_promotion_codes: true,
            });
        }

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error('[API] Stripe Checkout Error:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Failed to initiate checkout' },
            { status: 500 }
        );
    }
}
