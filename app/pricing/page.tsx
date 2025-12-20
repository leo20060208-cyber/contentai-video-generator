'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Euro } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Suspense, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

type BillingInterval = 'month' | 'year';

function PricingPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [interval, setInterval] = useState<BillingInterval>('month');
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const nextPath = useMemo(() => searchParams.get('next') ?? '/profile', [searchParams]);

    const startCheckout = async (payload: { kind: 'subscription'; plan: 'starter' | 'pro'; interval: BillingInterval } | { kind: 'pay_per_video' }) => {
        if (!user) {
            router.push(`/login?next=${encodeURIComponent(`/pricing?next=${encodeURIComponent(nextPath)}`)}`);
            return;
        }

        setIsLoading(payload.kind === 'pay_per_video' ? 'pay_per_video' : `${payload.plan}_${payload.interval}`);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) {
                router.push(`/login?next=${encodeURIComponent(`/pricing?next=${encodeURIComponent(nextPath)}`)}`);
                return;
            }

            const res = await fetch('/api/billing/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...payload, next: nextPath }),
            });

            const json = await res.json();
            if (!res.ok || !json?.success || !json?.data?.url) {
                throw new Error(json?.error || 'Failed to start checkout');
            }

            window.location.href = json.data.url as string;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Checkout failed';
            alert(msg);
        } finally {
            setIsLoading(null);
        }
    };

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
                    <h1 className="text-3xl md:text-4xl font-black text-white">
                        Choose your plan
                    </h1>
                    <p className="text-zinc-400 mt-3">
                        Starter (credits) or Pro (unlimited). You can also buy single videos for 5€.
                    </p>
                </motion.div>

                {/* Interval toggle */}
                <div className="flex items-center justify-center mb-10">
                    <div className="inline-flex rounded-full bg-zinc-900 border border-white/10 p-1">
                        <button
                            type="button"
                            onClick={() => setInterval('month')}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${interval === 'month' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() => setInterval('year')}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${interval === 'year' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Yearly
                        </button>
                    </div>
                </div>

                {/* Plans */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Starter */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="relative rounded-2xl p-8 bg-zinc-900 border border-white/5 shadow-lg"
                    >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-zinc-800">
                            <Zap className="w-6 h-6 text-zinc-300" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                        <p className="text-sm text-zinc-500 mb-6">Perfect to start. Includes credits.</p>

                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-4xl font-bold text-white">{interval === 'month' ? '€' : '€'}</span>
                            <span className="text-4xl font-bold text-white">{interval === 'month' ? '9' : '90'}</span>
                            <span className="text-zinc-500">{interval === 'month' ? '/month' : '/year'}</span>
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-zinc-800">
                                    <Check className="w-3 h-3 text-zinc-500" />
                                </div>
                                <span className="text-sm text-zinc-400">
                                    {interval === 'month' ? '5 videos/month' : '60 videos/year'} (credits)
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-zinc-800">
                                    <Check className="w-3 h-3 text-zinc-500" />
                                </div>
                                <span className="text-sm text-zinc-400">Standard export</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-zinc-800">
                                    <Check className="w-3 h-3 text-zinc-500" />
                                </div>
                                <span className="text-sm text-zinc-400">Email support</span>
                            </li>
                        </ul>

                        <Button
                            variant="outline"
                            className="w-full border-white/10 text-white hover:bg-zinc-800"
                            disabled={isLoading === `starter_${interval}`}
                            onClick={() => startCheckout({ kind: 'subscription', plan: 'starter', interval })}
                        >
                            {isLoading === `starter_${interval}` ? 'Redirecting…' : 'Subscribe Starter'}
                        </Button>
                    </motion.div>

                    {/* Pro */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative rounded-2xl p-8 bg-zinc-900 border-2 border-orange-500 shadow-xl shadow-orange-500/10"
                    >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <span className="px-4 py-1.5 rounded-full bg-orange-500 text-white text-xs font-bold uppercase shadow-md">
                                Most Popular
                            </span>
                        </div>

                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-orange-500/10">
                            <Sparkles className="w-6 h-6 text-orange-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
                        <p className="text-sm text-zinc-500 mb-6">Unlimited generations while active.</p>

                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-4xl font-bold text-white">€</span>
                            <span className="text-4xl font-bold text-white">{interval === 'month' ? '29' : '290'}</span>
                            <span className="text-zinc-500">{interval === 'month' ? '/month' : '/year'}</span>
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-orange-500/10">
                                    <Check className="w-3 h-3 text-orange-500" />
                                </div>
                                <span className="text-sm text-zinc-300">Unlimited videos</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-orange-500/10">
                                    <Check className="w-3 h-3 text-orange-500" />
                                </div>
                                <span className="text-sm text-zinc-300">Priority rendering</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-orange-500/10">
                                    <Check className="w-3 h-3 text-orange-500" />
                                </div>
                                <span className="text-sm text-zinc-300">Support</span>
                            </li>
                        </ul>

                        <Button
                            variant="primary"
                            className="w-full"
                            disabled={isLoading === `pro_${interval}`}
                            onClick={() => startCheckout({ kind: 'subscription', plan: 'pro', interval })}
                        >
                            {isLoading === `pro_${interval}` ? 'Redirecting…' : 'Subscribe Pro'}
                        </Button>
                    </motion.div>
                </div>

                {/* Pay per video */}
                <div className="mt-10 rounded-2xl border border-white/10 bg-zinc-900 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                            <Euro className="w-5 h-5 text-zinc-300" />
                        </div>
                        <div>
                            <div className="text-white font-bold">Pay per video</div>
                            <div className="text-zinc-400 text-sm">Buy 1 credit for €5 (no subscription).</div>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="border-white/10 text-white hover:bg-zinc-800"
                        disabled={isLoading === 'pay_per_video'}
                        onClick={() => startCheckout({ kind: 'pay_per_video' })}
                    >
                        {isLoading === 'pay_per_video' ? 'Redirecting…' : 'Buy 1 video (5€)'}
                    </Button>
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

export default function PricingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
            <PricingPageInner />
        </Suspense>
    );
}
