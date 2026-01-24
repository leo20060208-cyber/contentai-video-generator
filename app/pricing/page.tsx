import { Suspense } from 'react';
import { getActiveProducts } from '@/lib/stripe/config';
import PricingClient, { PricingProduct } from '@/components/pricing/PricingClient';
import { FaqSection } from '@/components/pricing/FaqSection';
import { STRIPE_PLANS } from '@/lib/stripe/config';

// Map for fallback descriptions and icons if Stripe metadata is missing
const planDescriptions: Record<string, any> = {
    'Starter': {
        description: 'Perfect for getting started',
        features: [
            '400 credits/month',
            '~13 Magic Videos (5s)',
            'OR ~5 Video Editing',
            '~66 Image Editing',
            'Library access',
            'HD export quality',
        ],
        popular: false
    },
    'Pro': {
        description: 'Best value for creators',
        features: [
            '875 credits/month',
            '~29 Magic Videos (5s)',
            'OR ~11 Video Editing',
            '~145 Image Editing',
            'Priority rendering',
            'HD & 4K export quality',
        ],
        popular: true
    },
    'Elite': {
        description: 'For high-volume generation',
        features: [
            '1600 credits/month',
            '~53 Magic Videos (5s)',
            'OR ~21 Video Editing',
            '~266 Image Editing',
            'Top priority rendering',
            'Early access features',
        ],
        popular: false
    }
};

export const dynamic = 'force-dynamic'; // Ensure we fetch fresh data on every request

export default async function PricingPage() {
    let products: PricingProduct[] = [];

    try {
        const stripeProducts = await getActiveProducts();

        // Merge Stripe Data with UI Definitions
        products = stripeProducts.map(p => {
            const uiDef = planDescriptions[p.name] || {};
            return {
                ...p,
                description: (p as any).description || uiDef.description || 'Flexible plan',
                features: (p.features && p.features.length > 0) ? p.features : (uiDef.features || []),
                popular: (p as any).popular || uiDef.popular || false
            };
        });

        // Sort: Starter -> Pro -> Elite (Based on amount, or manual sort)
        products.sort((a, b) => a.amount - b.amount);

    } catch (error) {
        console.error('Failed to fetch pricing products:', error);
        // Fallback to hardcoded constants if Stripe API fails (e.g. invalid key)
        // This prevents the page from crashing entirely
        console.warn('Using fallback hardcoded plans due to fetch error');
        products = [
            {
                id: STRIPE_PLANS.STARTER.priceId,
                name: 'Starter',
                amount: 19,
                currency: 'eur',
                interval: 'month',
                credits: 400,
                tier: 'normal',
                ...planDescriptions['Starter']
            },
            {
                id: STRIPE_PLANS.PRO.priceId,
                name: 'Pro',
                amount: 34,
                currency: 'eur',
                interval: 'month',
                credits: 875,
                tier: 'pro',
                ...planDescriptions['Pro']
            },
            {
                id: STRIPE_PLANS.ELITE.priceId,
                name: 'Elite',
                amount: 59,
                currency: 'eur',
                interval: 'month',
                credits: 1600,
                tier: 'elite',
                ...planDescriptions['Elite']
            }
        ];
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen pt-24 text-center text-zinc-400 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>Loading latest pricing...</p>
                </div>
            </div>
        }>
            <PricingClient plans={products} />
            <div className="pb-10">
                <FaqSection />
            </div>
        </Suspense>
    );
}
