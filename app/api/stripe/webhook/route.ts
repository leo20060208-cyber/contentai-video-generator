import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

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
        }

        // Handle other event types if needed (e.g., subscription lifecycle)

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
    const { error: txError } = await supabase.from('transactions').insert({
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
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
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
                const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
                updates.subscription_period_end = new Date(subscription.current_period_end * 1000).toISOString();
                console.log(`[Webhook] Subscription period end: ${updates.subscription_period_end}`);
            } catch (e) {
                console.error('[Webhook] Failed to fetch subscription details:', e);
            }
        }
    }

    const { error: updateError } = await supabase
        .from('profiles')
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

// Helper function to log errors to database
async function logError(
    supabase: ReturnType<typeof createClient>,
    userId: string | null,
    errorType: string,
    errorMessage: string,
    errorCode: string | null | undefined,
    errorDetails: any,
    stripeSessionId: string | null,
    stripeEventType: string
) {
    try {
        await supabase.from('error_logs').insert({
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
    supabase: ReturnType<typeof createClient>,
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    actionUrl?: string
) {
    try {
        await supabase.from('user_notifications').insert({
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

