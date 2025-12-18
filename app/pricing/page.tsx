'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const plans = [
    {
        name: 'Starter',
        price: 'Free',
        period: '',
        description: 'Perfect for trying out Antigravity',
        icon: Zap,
        features: [
            '5 video recreations/month',
            'Basic AI transformations',
            'Standard quality export',
            'Email support',
        ],
        cta: 'Start Free',
        popular: false,
    },
    {
        name: 'Pro',
        price: '$29',
        period: '/month',
        description: 'For creators and small businesses',
        icon: Sparkles,
        features: [
            'Unlimited video recreations',
            'Advanced AI transformations',
            'HD & 4K export quality',
            'Custom brand assets',
            'Priority rendering',
            'Chat support',
        ],
        cta: 'Get Pro',
        popular: true,
    },
    {
        name: 'Enterprise',
        price: '$99',
        period: '/month',
        description: 'For agencies and large teams',
        icon: Crown,
        features: [
            'Everything in Pro',
            'Team collaboration',
            'API access',
            'White-label exports',
            'Dedicated account manager',
            'Custom integrations',
        ],
        cta: 'Contact Sales',
        popular: false,
    },
];

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
            <div className="container mx-auto max-w-6xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <span className="text-orange-500 text-sm font-bold tracking-wider uppercase mb-4 block">
                        Pricing
                    </span>
                </motion.div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-2xl p-8 ${plan.popular
                                ? 'bg-zinc-900 border-2 border-orange-500 shadow-xl shadow-orange-500/10'
                                : 'bg-zinc-900 border border-white/5 shadow-lg'
                                }`}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="px-4 py-1.5 rounded-full bg-orange-500 text-white text-xs font-bold uppercase shadow-md">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            {/* Plan Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${plan.popular ? 'bg-orange-500/10' : 'bg-zinc-800'
                                }`}>
                                <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-orange-500' : 'text-zinc-400'}`} />
                            </div>

                            {/* Plan Details */}
                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                            <p className="text-sm text-zinc-500 mb-6">{plan.description}</p>

                            {/* Price */}
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">{plan.price}</span>
                                {plan.period && <span className="text-zinc-500">{plan.period}</span>}
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.popular ? 'bg-orange-500/10' : 'bg-zinc-800'
                                            }`}>
                                            <Check className={`w-3 h-3 ${plan.popular ? 'text-orange-500' : 'text-zinc-500'}`} />
                                        </div>
                                        <span className="text-sm text-zinc-400">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Button
                                variant={plan.popular ? 'primary' : 'outline'}
                                className={`w-full ${!plan.popular && 'border-white/10 text-white hover:bg-zinc-800'}`}
                            >
                                {plan.cta}
                            </Button>
                        </motion.div>
                    ))}
                </div>

                {/* FAQ or Additional Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-16"
                >
                    <p className="text-zinc-500">
                        Need a custom plan?{' '}
                        <a href="#" className="text-orange-500 hover:underline font-medium">Contact us</a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
