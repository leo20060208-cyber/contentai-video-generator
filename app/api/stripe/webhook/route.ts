import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getPlanByPriceId, STRIPE_PLANS } from '@/lib/stripe/config';

export const runtime = 'nodejs';

// Initialize Stripe lazily to avoid build-time errors when env vars aren't available
let _stripe: Stripe | null = null;
function getStripe() {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            throw new Error('STRIPE_SECRET_KEY is not set');
        }
        _stripe = new Stripe(key, {
            apiVersion: '2023-10-16' as any,
        });
    }
    return _stripe;
}

// Initialize Supabase Admin (Service Role) - created lazily to ensure env vars are loaded
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
    if (!_supabaseAdmin) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
        console.log('[Webhook] Initializing Supabase with URL:', url?.substring(0, 30) + '...');
        console.log('[Webhook] Service Role Key available:', !!key, key ? `(length: ${key.length})` : '');
        _supabaseAdmin = createClient(url, key);
    }
    return _supabaseAdmin;
}

const getEndpointSecret = () => process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
    const body = await request.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        const stripe = getStripe();
        const endpointSecret = getEndpointSecret();

        if (!sig || !endpointSecret) {
            console.warn('[Webhook] Missing signature or secret. Using basic parsing (insecure for prod if secret exists but strictly safer with it).');
            // Check if we are in local dev without CLI proxy (often user hasn't set up secret)
            // But usually we must rely on library verification.
            // If user hasn't set STRIPE_WEBHOOK_SECRET, we might skip verify for dev testing IF explicitly allowed, 
            // but for security we should default to fail or require it.
            // For this user context, we'll try standard constructEvent.
            if (!endpointSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
            event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        } else {
            event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        }
    } catch (err: any) {
        console.error(`[Webhook] Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    console.log(`[Webhook] Received event: ${event.type}`);

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            await handleCheckoutSessionCompleted(session);
        } else if (event.type === 'invoice.paid') {
            const invoice = event.data.object as Stripe.Invoice;
            await handleInvoicePaid(invoice);
        } else if (event.type === 'customer.subscription.updated') {
            const subscription = event.data.object as Stripe.Subscription;
            await handleSubscriptionUpdated(subscription);
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription;
            await handleSubscriptionDeleted(subscription);
        } else if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object as Stripe.Invoice;
            await handleInvoicePaymentFailed(invoice);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[Webhook] Handler failed:', error);
        return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
    }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const supabase = getSupabaseAdmin();
    const stripe = getStripe();

    console.log(`[Webhook] 🎯 checkout.session.completed: ${session.id}`);

    // 1. FIND USER: Try metadata first, then email lookup
    let userId = session.metadata?.userId || session.client_reference_id;
    const customerEmail = session.customer_details?.email?.toLowerCase().trim();
    const customerId = session.customer as string;

    if (!userId && customerEmail) {
        console.log(`[Webhook] No userId in metadata, searching by email: ${customerEmail}`);
        const { data } = await (supabase.from('profiles').select('id').eq('email', customerEmail).single() as any);
        userId = data?.id;
    }

    if (!userId) {
        console.error(`[Webhook] ❌ CRITICAL: Cannot find user for session ${session.id}. Email: ${customerEmail}`);
        await logError(supabase, null, 'checkout_no_user', 'User not found by metadata or email', null, { sessionId: session.id, email: customerEmail }, session.id, 'checkout.session.completed');
        return;
    }

    console.log(`[Webhook] ✅ Found user: ${userId}`);

    // 2. GET PLAN INFO: Fetch subscription to get priceId and credits from config
    let planConfig = null;
    let subscriptionPeriodEnd = null;

    if (session.subscription) {
        try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string, { expand: ['items.data.price'] }) as any;
            const priceId = subscription.items.data[0].price.id;
            planConfig = getPlanByPriceId(priceId);
            subscriptionPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
            console.log(`[Webhook] 📦 Plan: ${planConfig?.name}, Credits: ${planConfig?.credits}, Period End: ${subscriptionPeriodEnd}`);
        } catch (e) {
            console.error('[Webhook] Error fetching subscription details:', e);
        }
    }

    // Fallback: try to get plan from metadata if subscription fetch failed
    if (!planConfig) {
        const planName = session.metadata?.planName;
        if (planName) {
            planConfig = Object.values(STRIPE_PLANS).find(p => p.name.toLowerCase() === planName.toLowerCase());
        }
    }

    const credits = planConfig?.credits || 0;
    const planName = planConfig?.name || session.metadata?.planName || 'Unknown';

    // 3. UPDATE SUPABASE PROFILE
    const updates: any = {
        credits: credits, // Set to plan max, not accumulate
        plan: planName,
        subscription_status: 'active',
        stripe_customer_id: customerId,
    };

    if (subscriptionPeriodEnd) {
        updates.subscription_period_end = subscriptionPeriodEnd;
    }

    console.log(`[Webhook] 💾 Updating profile for ${userId}:`, updates);

    const { error } = await (supabase.from('profiles').update(updates).eq('id', userId) as any);

    if (error) {
        console.error('[Webhook] ❌ Profile update failed:', error);
        await logError(supabase, userId, 'profile_update_failed', error.message, error.code, error, session.id, 'checkout.session.completed');
        return;
    }

    // 4. LOG TRANSACTION
    await (supabase.from('transactions') as any).insert({
        user_id: userId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || 'eur',
        status: 'completed',
        stripe_payment_id: session.id,
        description: `Subscription: ${planName}`,
        credits_added: credits,
        metadata: { priceId: planConfig?.priceId, planName }
    });

    // 5. NOTIFY USER
    await createUserNotification(supabase, userId,
        '🎉 ¡Bienvenido a ' + planName + '!',
        `Tu suscripción está activa. Tienes ${credits} créditos disponibles.`,
        'success',
        '/profile'
    );

    console.log(`[Webhook] ✅ SUCCESS: User ${userId} is now ${planName} with ${credits} credits.`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const supabase = getSupabaseAdmin();
    const stripe = getStripe();

    const subscriptionId = (invoice as any).subscription as string;
    if (!subscriptionId) {
        console.log('[Webhook] Invoice.paid has no subscription, skipping.');
        return;
    }

    console.log(`[Webhook] 🧾 invoice.paid: ${invoice.id} for sub ${subscriptionId}`);

    try {
        // 1. GET SUBSCRIPTION AND PLAN INFO
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] }) as any;
        const priceId = subscription.items.data[0].price.id;
        const planConfig = getPlanByPriceId(priceId);

        if (!planConfig) {
            console.warn(`[Webhook] No plan config for priceId: ${priceId}`);
            return;
        }

        // 2. FIND USER: Try subscription metadata, then customer metadata, then email
        let userId = subscription.metadata?.userId;

        if (!userId) {
            console.log('[Webhook] No userId in subscription metadata, checking customer...');
            const customer = await stripe.customers.retrieve(invoice.customer as string) as any;
            userId = customer.metadata?.userId;

            if (!userId && customer.email) {
                console.log(`[Webhook] Searching user by customer email: ${customer.email}`);
                const { data } = await (supabase.from('profiles').select('id').eq('email', customer.email.toLowerCase()).single() as any);
                userId = data?.id;
            }
        }

        if (!userId) {
            console.error(`[Webhook] ❌ Cannot find user for invoice ${invoice.id}`);
            return;
        }

        // 3. UPDATE PROFILE: Reset credits to plan max
        console.log(`[Webhook] 💳 Resetting credits for ${userId} to ${planConfig.credits} (${planConfig.name})`);

        const { error } = await (supabase.from('profiles').update({
            credits: planConfig.credits,
            subscription_status: 'active',
            plan: planConfig.name,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_customer_id: invoice.customer as string
        }).eq('id', userId) as any);

        if (error) {
            console.error('[Webhook] Profile update error:', error);
        } else {
            console.log(`[Webhook] ✅ User ${userId} renewed with ${planConfig.credits} credits.`);
        }

    } catch (e: any) {
        console.error('[Webhook] handleInvoicePaid error:', e);
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const supabase = getSupabaseAdmin();
    const userId = subscription.metadata?.userId;

    if (!userId) return;

    const priceId = subscription.items.data[0].price.id;
    const planConfig = getPlanByPriceId(priceId);

    const updates: any = {
        subscription_status: subscription.status === 'active' ? 'active' : 'past_due',
        subscription_period_end: new Date((subscription as any).current_period_end * 1000).toISOString()
    };

    if (planConfig) {
        updates.plan = planConfig.name;
    }

    console.log(`[Webhook] Subscription updated for User ${userId}. Status: ${subscription.status}`);

    const { error } = await (supabase
        .from('profiles') as any)
        .update(updates)
        .eq('id', userId);

    if (error) {
        console.error('[Webhook] Error updating profile on subscription.updated:', error);
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const supabase = getSupabaseAdmin();
    const userId = subscription.metadata?.userId;

    if (!userId) return;

    console.log(`[Webhook] Subscription deleted for User ${userId}`);

    const { error } = await (supabase
        .from('profiles') as any)
        .update({
            subscription_status: 'inactive',
        })
        .eq('id', userId);

    if (error) {
        console.error('[Webhook] Error updating profile on subscription.deleted:', error);
    } else {
        await createUserNotification(supabase, userId,
            '🚫 Suscripción finalizada',
            'Tu suscripción ha terminado. Tus funciones premium han sido desactivadas.',
            'warning',
            '/pricing'
        );
    }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const supabase = getSupabaseAdmin();
    // Use any casting for nested properties that might be missed by the current SDK version types
    const userId = (invoice as any).subscription_details?.metadata?.userId || (invoice as any).metadata?.userId;

    // Si no está en metadatos, intentamos buscar el cliente en Stripe para obtener el userId
    let finalUserId = userId;
    if (!finalUserId) {
        const stripe = getStripe();
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        finalUserId = (customer as any).metadata?.userId;
    }

    if (!finalUserId) {
        console.error('[Webhook] Could not find userId for failed invoice:', invoice.id);
        return;
    }

    console.log(`[Webhook] Payment failed for User ${finalUserId}. Invoice: ${invoice.id}`);

    // Marcamos estado en la DB como past_due si queremos ser estrictos
    await (supabase.from('profiles') as any)
        .update({ subscription_status: 'past_due' })
        .eq('id', finalUserId);

    await createUserNotification(supabase, finalUserId,
        '⚠️ Problema con tu pago',
        'No hemos podido procesar el cargo de tu suscripción. Por favor, revisa tu método de pago para evitar perder el acceso premium.',
        'error',
        '/profile'
    );

    await logError(supabase, finalUserId, 'payment_failed', 'Invoice payment failed', null, { invoiceId: invoice.id }, null, 'invoice.payment_failed');
}

// Helper function to log errors to database
async function logError(
    supabase: any,
    userId: string | null,
    errorType: string,
    errorMessage: string,
    errorCode: string | null | undefined,
    errorDetails: any,
    stripeSessionId: string | null,
    stripeEventType: string
) {
    try {
        await (supabase.from('error_logs') as any).insert({
            user_id: userId,
            error_type: errorType,
            error_message: errorMessage,
            error_code: errorCode || null,
            error_details: errorDetails,
            stripe_session_id: stripeSessionId,
            stripe_event_type: stripeEventType
        });
    } catch (e) {
        console.error('[Webhook] Failed to log error to database:', e);
    }
}

// Helper function to create user notifications
async function createUserNotification(
    supabase: any,
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    actionUrl?: string
) {
    try {
        await (supabase.from('user_notifications') as any).insert({
            user_id: userId,
            title,
            message,
            type,
            action_url: actionUrl
        });
    } catch (e) {
        console.error('[Webhook] Failed to create user notification:', e);
    }
}
