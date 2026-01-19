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

// Helper para obtener el plan por nombre
export const getPlanByName = (name: string) => {
    const upperName = name.toUpperCase();
    return STRIPE_PLANS[upperName as keyof typeof STRIPE_PLANS];
};
