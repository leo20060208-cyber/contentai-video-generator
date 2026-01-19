/**
 * Centralized Stripe Configuration
 * Mapeo oficial de IDs de Stripe a lógica de negocio (créditos, nombres)
 */

export const STRIPE_PLANS = {
    STARTER: {
        name: 'Starter',
        priceId: 'price_1Smt3w3pHdaDhch3uYpZJJ4g',
        credits: 400,
        tier: 'normal'
    },
    PRO: {
        name: 'Pro',
        priceId: 'price_1Smt4A3pHdaDhch3FI9DCmnU',
        credits: 875,
        tier: 'pro'
    },
    ELITE: {
        name: 'Elite',
        priceId: 'price_1Smt4S3pHdaDhch3JQZ2Sd99',
        credits: 1600,
        tier: 'elite'
    }
} as const;

// Helper para obtener el plan por Price ID (usado en Webhooks)
export const getPlanByPriceId = (priceId: string) => {
    return Object.values(STRIPE_PLANS).find(plan => plan.priceId === priceId);
};

// Helper para obtener el plan por nombre, insensible a mayúsculas
export const getPlanByName = (name: string) => {
    const upperName = name.toUpperCase();
    return STRIPE_PLANS[upperName as keyof typeof STRIPE_PLANS];
};

/**
 * Fetch active prices directly from Stripe to ensure environment consistency (Test vs Live).
 * This replaces hardcoded constants for the frontend display.
 */
import Stripe from 'stripe';

export const getActiveProducts = async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
    const prices = await stripe.prices.list({
        active: true,
        limit: 10,
        expand: ['data.product']
    });

    // Map Stripe data to our Plan structure dynamically
    const products = prices.data.map(price => {
        const product = price.product as Stripe.Product;
        const metadata = product.metadata || {};
        const priceMeta = price.metadata || {};

        // Prefer explicit metadata, fallback to hardcoded logic if needed
        const tier = (metadata.tier || priceMeta.tier || 'normal').toLowerCase();
        const credits = parseInt(metadata.credits || priceMeta.credits || '0');

        return {
            id: price.id,
            name: product.name,
            amount: (price.unit_amount || 0) / 100,
            currency: price.currency,
            interval: price.recurring?.interval || 'one_time',
            credits: credits,
            tier: tier,
            features: JSON.parse(metadata.features || '[]') // Optional: store features in metadata
        };
    });

    return products;
};
