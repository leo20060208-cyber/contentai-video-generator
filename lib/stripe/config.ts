/**
 * Centralized Stripe Configuration
 * Mapeo oficial de IDs de Stripe a lógica de negocio (créditos, nombres)
 */

export const STRIPE_PLANS = {
    STARTER: {
        name: 'Starter',
        priceId: 'price_1Sr0bj9qh0qVkdaIlhbcxNHJ', // Reemplaza con tus IDs finales si cambian
        credits: 400,
        tier: 'normal'
    },
    PRO: {
        name: 'Pro',
        priceId: 'price_1Sr0bx9qh0qVkdaIDwuQEOkJ',
        credits: 875,
        tier: 'pro'
    },
    ELITE: {
        name: 'Elite',
        priceId: 'price_1Sr0cA9qh0qVkdaIk0GVjBN2',
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
