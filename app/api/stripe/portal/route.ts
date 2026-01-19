import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
    try {
        const supabase = await createClient(); // Await the client creation
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userId = session.user.id;
        const body = await req.json().catch(() => ({}));
        const returnUrl = body.returnUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Get customer ID from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        if (!profile?.stripe_customer_id) {
            return new NextResponse('No Stripe Customer ID found', { status: 400 });
        }

        // Create Portal Session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${returnUrl}/profile`,
        });

        return NextResponse.json({ url: portalSession.url });

    } catch (error: any) {
        console.error('Portal Error:', error);
        return new NextResponse(error.message, { status: 500 });
    }
}
