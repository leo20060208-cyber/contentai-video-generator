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
    const userId = session.metadata?.userId;
    const creditsToAdd = parseInt(session.metadata?.credits || '0', 10);
    const planName = session.metadata?.planName || 'Unknown Plan';
    const supabase = getSupabaseAdmin();

    console.log(`[Webhook] Processing checkout for User ${userId}. Credits: ${creditsToAdd}, Plan: ${planName}`);

    if (!userId) {
        console.error('[Webhook] No userId in metadata');
        await logError(supabase, null, 'payment_webhook', 'No userId in session metadata', 'MISSING_USER_ID', {
            sessionId: session.id,
            metadata: session.metadata
        }, session.id, 'checkout.session.completed');
        return;
    }

    // 1. Log Transaction
    const { error: txError } = await (supabase.from('transactions') as any).insert({
        user_id: userId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        status: 'completed',
        stripe_payment_id: session.id,
        description: `Purchase: ${planName}`,
        credits_added: creditsToAdd,
        metadata: session.metadata
    });

    if (txError) {
        console.error('[Webhook] Failed to log transaction:', txError);
        await logError(supabase, userId, 'transaction_log', txError.message, txError.code, txError, session.id, 'checkout.session.completed');
        // Continue to add credits anyway, critical part.
    }

    // 2. Fetch User Profile
    const { data: profile, error: profileError } = await (supabase
        .from('profiles') as any)
        .select('credits, subscription_status')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error('[Webhook] Failed to fetch profile:', profileError);
        await logError(supabase, userId, 'profile_fetch', profileError.message, profileError.code, profileError, session.id, 'checkout.session.completed');

        // Notify user about the issue
        await createUserNotification(supabase, userId,
            '⚠️ Error al procesar tu pago',
            `Hubo un problema al añadir tus ${creditsToAdd} créditos del plan ${planName}. Nuestro equipo ha sido notificado y lo resolverá pronto. Si no se resuelve en 24h, contacta soporte.`,
            'error',
            '/profile'
        );
        return;
    }

    // 3. Update Credits & Subscription Status
    const currentCredits = profile.credits || 0;
    const newCredits = currentCredits + creditsToAdd;

    const updates: any = {
        credits: newCredits,
    };

    // If it's a subscription, update status and fetch period end
    if (session.mode === 'subscription') {
        updates.subscription_status = 'active';
        updates.plan = planName;
        updates.stripe_customer_id = session.customer as string;

        // Get subscription period end from Stripe if subscription exists
        if (session.subscription) {
            try {
                const stripe = getStripe();
                const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as any;
                updates.subscription_period_end = new Date(subscription.current_period_end * 1000).toISOString();
                console.log(`[Webhook] Subscription period end: ${updates.subscription_period_end}`);
            } catch (e) {
                console.error('[Webhook] Failed to fetch subscription details:', e);
            }
        }
    }

    const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update(updates)
        .eq('id', userId);

    if (updateError) {
        console.error('[Webhook] Failed to update credits:', updateError);
        await logError(supabase, userId, 'credit_update', updateError.message, updateError.code, updateError, session.id, 'checkout.session.completed');

        // Notify user about the issue
        await createUserNotification(supabase, userId,
            '⚠️ Error al añadir créditos',
            `Hubo un problema al añadir tus ${creditsToAdd} créditos. Nuestro equipo ha sido notificado. Referencia: ${session.id}`,
            'error',
            '/profile'
        );
        throw updateError;
    }

    // Success notification
    await createUserNotification(supabase, userId,
        '🎉 Pago procesado correctamente',
        `Se han añadido ${creditsToAdd} créditos a tu cuenta. Tu nuevo balance es ${newCredits} créditos. ¡Gracias por tu compra!`,
        'success',
        '/profile'
    );

    console.log(`[Webhook] Successfully added ${creditsToAdd} credits to User ${userId}. New Balance: ${newCredits}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const supabase = getSupabaseAdmin();
    const stripe = getStripe();

    const subscriptionId = (invoice as any).subscription as string;
    if (!subscriptionId) return;

    try {
        // Retrieve subscription to get priceId and userId
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
        const priceId = subscription.items.data[0].price.id;
        const userId = subscription.metadata?.userId;

        if (!userId) {
            console.error('[Webhook] No userId in subscription metadata for invoice:', invoice.id);
            return;
        }

        const planConfig = getPlanByPriceId(priceId);
        if (!planConfig) {
            console.warn(`[Webhook] No plan config found for Price ID: ${priceId}`);
            return;
        }

        console.log(`[Webhook] Processing invoice.paid for User ${userId}. Plan: ${planConfig.name}. Resetting credits to: ${planConfig.credits}`);

        // Update profile: Reset credits to plan max and update period end
        const { error } = await (supabase
            .from('profiles') as any)
            .update({
                credits: planConfig.credits, // Reset mensual
                subscription_status: 'active',
                plan: planConfig.name,
                subscription_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                stripe_customer_id: invoice.customer as string
            })
            .eq('id', userId);

        if (error) {
            console.error('[Webhook] Error updating profile on invoice.paid:', error);
            await logError(supabase, userId, 'invoice_paid_update', error.message, error.code, error, invoice.id, 'invoice.paid');
        } else {
            await createUserNotification(supabase, userId,
                '🔄 Créditos renovados',
                `Tu suscripción ${planConfig.name} se ha renovado. Tus créditos se han reseteado a ${planConfig.credits}.`,
                'info',
                '/profile'
            );
        }
    } catch (e: any) {
        console.error('[Webhook] Error in handleInvoicePaid:', e);
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
