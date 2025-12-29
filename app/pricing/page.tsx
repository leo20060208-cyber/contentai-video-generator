'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Coins, Building2, Crown, CreditCard, Clock, Info, Lock as LockIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useState } from 'react';
import { BusinessContactModal } from '@/components/BusinessContactModal';

const subscriptions = [
    {
        name: 'Starter',
        price: '€19',
        period: '/month',
        credits: 400,
        description: 'Perfect for getting started',
        icon: Zap,
        features: [
            '400 credits/month',
            '~5 videos/month',
            'Library access',
            'HD export quality',
        ],
        cta: 'Get Started',
        popular: false,
        highlight: 'bg-zinc-800'
    },
    {
        name: 'Pro',
        price: '€34',
        period: '/month',
        credits: 875,
        description: 'Best value for creators',
        icon: Sparkles,
        features: [
            '875 credits/month',
            '~12 videos/month',
            'Priority rendering',
            'HD & 4K export quality',
        ],
        cta: 'Get Pro',
        popular: true,
        highlight: 'bg-orange-500/10 border-orange-500'
    },
    {
        name: 'Elite',
        price: '€59',
        period: '/month',
        credits: 1600,
        description: 'For high-volume generation',
        icon: Crown,
        features: [
            '1600 credits/month',
            '~22 videos/month',
            'Top priority rendering',
            'Early access features',
        ],
        cta: 'Get Elite',
        popular: false,
        highlight: 'bg-zinc-800'
    },
];

export default function PricingPage() {
    const { profile } = useAuth();
    const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-zinc-950 pt-24 pb-16 px-4">
            <div className="container mx-auto max-w-6xl">
                {/* Header - Scaled Down */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <span className="text-orange-500 text-xs font-bold tracking-wider uppercase mb-3 block">
                        Pricing Plans
                    </span>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                        Choose Your Creative Power
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto text-base">
                        Flexible plans designed to scale with your content needs. Cancel anytime.
                    </p>
                </motion.div>

                {/* Subscriptions Grid (Top) - Compact */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-5xl mx-auto">
                    {subscriptions.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-2xl p-6 flex flex-col ${plan.popular
                                ? 'bg-zinc-900 border-2 border-orange-500 shadow-xl shadow-orange-500/10 z-10'
                                : 'bg-zinc-900/50 border border-white/5 hover:border-white/10'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase shadow-lg tracking-wide">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${plan.popular ? 'bg-orange-500/10' : 'bg-white/5'
                                    }`}>
                                    <plan.icon className={`w-5 h-5 ${plan.popular ? 'text-orange-500' : 'text-zinc-400'}`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                                <p className="text-xs text-zinc-500">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-white">{plan.price}</span>
                                    <span className="text-zinc-500 text-sm">{plan.period}</span>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-6 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <Check className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-orange-500' : 'text-zinc-600'}`} />
                                        <span className="text-xs text-zinc-300">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                variant={plan.popular ? 'primary' : 'outline'}
                                className="w-full py-4 text-sm h-10"
                                onClick={() => alert('Stripe Integration Pending')}
                            >
                                {plan.cta}
                            </Button>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom Options (Single & Business) - Compact */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto mb-12">
                    {/* Single Video Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="rounded-2xl p-6 bg-zinc-900/30 border border-white/5 flex flex-col md:flex-row items-center gap-6 hover:bg-zinc-900/50 transition-colors"
                    >
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold mb-3 border border-blue-500/10">
                                <CreditCard className="w-3 h-3" />
                                Pay As You Go
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1.5">Single Video</h3>
                            <p className="text-sm text-zinc-400 mb-4 text-xs">
                                Need just one video? Get full access without a monthly commitment.
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center md:justify-start text-xs text-zinc-500 mb-4">
                                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-blue-500" /> 75 Credits</span>
                                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-blue-500" /> Commercial Rights</span>
                            </div>
                            <Button variant="outline" size="sm" className="min-w-[140px] border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400 text-xs h-9">
                                Buy 1 Video • €5
                            </Button>
                        </div>
                        <div className="w-full md:w-auto flex-shrink-0">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/20 flex items-center justify-center relative mx-auto">
                                <div className="absolute inset-0 rounded-full animate-pulse bg-blue-500/5"></div>
                                <Zap className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Business Plan Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="rounded-2xl p-0.5 bg-gradient-to-br from-white/10 via-zinc-800 to-black relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                        <div className="h-full rounded-[14px] bg-zinc-950 p-6 flex flex-col relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-semibold mb-2 border border-white/10">
                                        <Building2 className="w-3 h-3" />
                                        Enterprise
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">Business Plan</h3>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setIsBusinessModalOpen(true)}
                                    className="bg-white text-black hover:bg-zinc-200 border-none shadow-lg shadow-white/5 text-xs h-8"
                                >
                                    Contact
                                </Button>
                            </div>

                            <p className="text-zinc-400 mb-6 border-l-2 border-white/20 pl-3 italic text-xs leading-relaxed">
                                "Our expert team does the heavy lifting for you. From detailed scriptwriting to full-scale generative video production."
                            </p>

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <div className="p-3 rounded-lg bg-zinc-900 border border-white/5">
                                    <h4 className="text-white font-medium mb-0.5 text-xs">Full Service</h4>
                                    <p className="text-[10px] text-zinc-500">We create, you publish.</p>
                                </div>
                                <div className="p-3 rounded-lg bg-zinc-900 border border-white/5">
                                    <h4 className="text-white font-medium mb-0.5 text-xs">Volume Scale</h4>
                                    <p className="text-[10px] text-zinc-500">Unlimited potential.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Subscriber Add-ons - Highlighted & Compact */}
                {/* Subscriber Add-ons - Highlighted & Compact */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-4xl mx-auto mb-8 relative"
                >
                    {/* Visual Anchor to ensure visibility */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-purple-500/5 rounded-2xl blur-xl -z-10"></div>

                    <div className={`border border-white/10 bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-6 relative ${profile?.subscription_status !== 'active' ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                        {profile?.subscription_status !== 'active' && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/90 border border-white/10 rounded-lg shadow-xl">
                                    <LockIcon className="w-4 h-4 text-zinc-400" />
                                    <span className="text-xs font-bold text-zinc-300">Subscribers Only</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-4 justify-center">
                            <Sparkles className="w-4 h-4 text-yellow-500" />
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Subscriber Exclusives</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Instant Credits */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                        <Coins className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div>
                                        <h5 className="text-white font-bold text-sm">Add 75 Credits</h5>
                                        <p className="text-zinc-500 text-[10px]">Instant top-up</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-white mb-1">€3.50</p>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={profile?.subscription_status !== 'active'}
                                        className="h-7 text-xs bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Buy Now
                                    </Button>
                                </div>
                            </div>

                            {/* Upgrade Path */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-purple-500/20 hover:border-purple-500/40 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                        <Crown className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div>
                                        <h5 className="text-white font-bold text-sm">Upgrade Plan</h5>
                                        <p className="text-zinc-500 text-[10px]">Pay difference only</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white mb-1">Pro-rated</p>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={profile?.subscription_status !== 'active'}
                                        className="h-7 text-xs bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Upgrade
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Credit Explanation Footer - Compact */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-4xl mx-auto rounded-2xl bg-zinc-900/30 border border-white/5 p-4 md:p-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Info className="w-4 h-4 text-zinc-500" />
                        <h4 className="text-sm font-bold text-white">Credit Usage Breakdown</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-white/5">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-green-500" />
                                <span className="text-zinc-300 text-xs font-medium">Short</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500">≤ 10 Sec</p>
                                <p className="text-sm font-bold text-white">75 Credits</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-white/5">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <span className="text-zinc-300 text-xs font-medium">Medium</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500">≤ 15 Sec</p>
                                <p className="text-sm font-bold text-white">95 Credits</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-white/5">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-red-500" />
                                <span className="text-zinc-300 text-xs font-medium">Long</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500">≤ 20 Sec</p>
                                <p className="text-sm font-bold text-white">130 Credits</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Modals */}
            <BusinessContactModal
                isOpen={isBusinessModalOpen}
                onClose={() => setIsBusinessModalOpen(false)}
            />
        </div>
    );
}
