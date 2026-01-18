import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any }) : null;

export async function GET(request: Request) {
    try {
        console.log('[API] Check Subscription Details Request');

        // 1. Auth Check
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const authHeader = request.headers.get('authorization');
        let userId: string | null = null;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                userId = user.id;
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get Stripe Customer ID from Profile (Use service role)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
        const adminDb = createClient(supabaseUrl, serviceRoleKey!);

        const { data: profile } = await adminDb
            .from('profiles')
            .select('stripe_customer_id, subscription_status')
            .eq('id', userId)
            .single();

        if (!profile?.stripe_customer_id || profile.subscription_status !== 'active') {
            return NextResponse.json({ hasSubscription: false });
        }

        if (!stripe) {
            return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        // 3. Fetch Subscription from Stripe
        const subscriptions = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            status: 'active',
            limit: 1,
            expand: ['data.plan.product', 'data.latest_invoice', 'data.pending_update']
        });

        if (subscriptions.data.length === 0) {
            return NextResponse.json({ hasSubscription: false });
        }

        const sub = subscriptions.data[0];

        // Check for Schedule (Downgrades/Scheduled Changes)
        let scheduleObj = null;
        if (sub.schedule) {
            try {
                scheduleObj = await stripe.subscriptionSchedules.retrieve(sub.schedule as string);
            } catch (e) {
                console.log('Error fetching schedule:', e);
            }
        }

        let pendingChange = null;

        // 1. Check for Cancellation
        if (sub.cancel_at_period_end) {
            pendingChange = {
                type: 'cancellation',
                date: new Date((sub as any).current_period_end * 1000).toISOString(),
                description: 'Subscription will be canceled at the end of the period.'
            };
        }
        // 2. Check for Scheduled Downgrade/Change
        else if (scheduleObj && scheduleObj.phases.length > 1) {
            const nextPhase = scheduleObj.phases[1]; // Next phase
            pendingChange = {
                type: 'scheduled_change',
                date: new Date(nextPhase.start_date * 1000).toISOString(),
                description: `Plan will change automatically on ${new Date(nextPhase.start_date * 1000).toLocaleDateString()}.`
            };
        }

        // This is tricky: Stripe doesn't always show "next phase" easily in one field for simple updates
        // unless it's a schedule.
        // However, we can check `sub.items.data` vs `sub.pending_update`.
        // If we want to know the *next* invoice amount:

        let nextInvoiceEstimate = null;
        try {
            const upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
                customer: profile.stripe_customer_id,
                subscription: sub.id,
            });
            nextInvoiceEstimate = {
                amount: upcomingInvoice.amount_due / 100,
                currency: upcomingInvoice.currency,
                date: new Date(upcomingInvoice.period_end * 1000).toISOString() // Usually next charge date
            };
        } catch (e) {
            console.log('No upcoming invoice found (maybe cancelling?)');
        }

        const subAny = sub as any;

        return NextResponse.json({
            hasSubscription: true,
            planName: (subAny.plan as any)?.product?.name || 'Unknown',
            amount: subAny.plan?.amount ? (subAny.plan.amount / 100) : 0,
            currency: subAny.plan?.currency,
            interval: subAny.plan?.interval,
            currentPeriodEnd: new Date(subAny.current_period_end * 1000).toISOString(),
            pendingChange: pendingChange, // Cancellation or specific schedule
            nextInvoice: nextInvoiceEstimate
        });

    } catch (error) {
        console.error('[API] Subscription Details Error:', error);
        return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
    }
}
