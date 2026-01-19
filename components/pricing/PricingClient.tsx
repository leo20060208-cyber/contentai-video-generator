'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Zap, Coins, Building2, Crown, CreditCard, Clock, Info, Lock as LockIcon, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useState, useEffect } from 'react';
import { BusinessContactModal } from '@/components/BusinessContactModal';

// Define the shape of product data we expect
export interface PricingProduct {
    id: string; // Price ID
    name: string;
    amount: number;
    currency: string;
    interval: string;
    credits: number;
    tier: string;
    features: string[];
    description?: string;
    popular?: boolean;
    icon?: any; // Name of icon to map or logic
}

interface PricingClientProps {
    plans: PricingProduct[];
}

export default function PricingClient({ plans }: PricingClientProps) {
    const { profile, session, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<string | null>(null);

    // Show Success Message
    const isSuccess = searchParams.get('success');
    const isInsufficientCredits = searchParams.get('error') === 'insufficient_credits';
    const returnUrl = searchParams.get('returnUrl');

    const [showErrorToast, setShowErrorToast] = useState(isInsufficientCredits);
    const [showSuccessToast, setShowSuccessToast] = useState(!!isSuccess);

    // Handle Success Redirect
    useEffect(() => {
        if (isSuccess) {
            const timer = setTimeout(() => {
                if (returnUrl) {
                    window.location.href = decodedReturnUrl(returnUrl);
                } else {
                    window.location.href = '/profile';
                }
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [isSuccess, returnUrl, router]);

    const decodedReturnUrl = (url: string) => {
        try { return decodeURIComponent(url); } catch { return '/'; }
    };

    const handleManageSubscription = async () => {
        if (!session) return;
        try {
            setIsLoading('manage');
            const { data: { session: authSession } } = await (await import('@/lib/supabase')).supabase.auth.getSession();

            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSession?.access_token}`
                },
                body: JSON.stringify({
                    returnUrl: window.location.origin
                })
            });

            if (!res.ok) throw new Error('Failed to create portal session');

            const { url } = await res.json();
            window.location.href = url;
        } catch (error) {
            console.error('Portal error:', error);
            alert('Could not access subscription settings.');
            setIsLoading(null);
        }
    };

    const handlePurchase = async (plan: any) => {
        if (authLoading) return;

        if (!session) {
            router.push(`/login?redirect=/pricing${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`);
            return;
        }

        try {
            setIsLoading(plan.name);

            const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();

            // CRITICAL: If user is already subscribed and trying to change subscription, use Portal
            // If they are buying one-time credits, proceed to checkout
            const isSubscribed = profile?.subscription_status === 'active' && profile?.plan && profile.plan.toLowerCase() !== 'free';
            const isSubscriptionPlan = plan.interval === 'month' || plan.interval === 'year';

            if (isSubscribed && isSubscriptionPlan) {
                // Redirect to portal instead of checkout for plan changes
                await handleManageSubscription();
                return;
            }

            console.log(`[Pricing] Starting checkout for ${plan.name} (${plan.id})`);

            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    planName: plan.name,
                    priceId: plan.id, // Use the real ID passed from props
                    credits: plan.credits,
                    mode: plan.interval === 'one_time' ? 'payment' : 'subscription',
                    returnUrl,
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${res.status}`);
            }

            const { url } = await res.json();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('No checkout URL returned from API');
            }

        } catch (error) {
            console.error('Purchase error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to initiate checkout: ${errorMessage}`);
            setIsLoading(null);
        }
    };

    // Helper to map icon names to components if needed, currently passed or hardcoded map in parent
    const getIcon = (planName: string) => {
        const lower = planName.toLowerCase();
        if (lower.includes('pro')) return Sparkles;
        if (lower.includes('elite')) return Crown;
        return Zap;
    };

    // Helper to determine single video price ID (Dynamic lookup from plans if available)
    const singleVideoPlan = plans.find(p => p.name.includes('Single Video') || p.id.includes('price_1SrMTW3pHdaDhch3yIPQP2WZ'));
    const topUpPlan = plans.find(p => p.name.includes('Credit Top-up') || p.id.includes('price_1SrMTX3pHdaDhch33m3L4jKj'));

    // Filter out 'one_time' plans from the main grid
    const subscriptionPlans = plans.filter(p => p.interval !== 'one_time');

    return (
        <div className="min-h-screen pt-24 pb-16 px-4 relative">
            {/* Toast Notification for Insufficient Credits */}
            <AnimatePresence>
                {showErrorToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className="fixed top-24 left-1/2 z-50 bg-red-500/10 border border-red-500 text-red-200 px-6 py-3 rounded-full backdrop-blur-md shadow-xl flex items-center gap-3"
                    >
                        <div className="bg-red-500 rounded-full p-1"><Zap className="w-3 h-3 text-white fill-current" /></div>
                        <span className="text-sm font-medium">Insufficient credits to generate. Please top up.</span>
                        <button onClick={() => setShowErrorToast(false)} className="ml-2 hover:text-white"><Check className="w-4 h-4" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast Notification for Success */}
            <AnimatePresence>
                {showSuccessToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className="fixed top-24 left-1/2 z-50 bg-green-500/10 border border-green-500 text-green-200 px-6 py-3 rounded-full backdrop-blur-md shadow-xl flex items-center gap-3"
                    >
                        <div className="bg-green-500 rounded-full p-1"><Check className="w-3 h-3 text-black" /></div>
                        <span className="text-sm font-medium">Payment Successful! Credits added. Redirecting...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="container mx-auto max-w-6xl">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-5xl mx-auto">
                    {subscriptionPlans.map((plan, index) => {
                        const isCurrentPlan = profile?.plan?.toLowerCase() === plan.name.toLowerCase() && profile?.subscription_status === 'active';
                        const PlanIcon = getIcon(plan.name);

                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`relative rounded-2xl p-6 flex flex-col ${isCurrentPlan
                                    ? 'bg-green-900/20 border-2 border-green-500 shadow-xl shadow-green-500/10 z-10'
                                    : plan.popular
                                        ? 'bg-zinc-900 border-2 border-orange-500 shadow-xl shadow-orange-500/10 z-10'
                                        : 'bg-zinc-900/50 border border-white/5 hover:border-white/10'
                                    }`}
                            >
                                {isCurrentPlan ? (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-3 py-1 rounded-full bg-green-500 text-white text-[10px] font-bold uppercase shadow-lg tracking-wide flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Current Plan
                                        </span>
                                    </div>
                                ) : plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase shadow-lg tracking-wide">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isCurrentPlan ? 'bg-green-500/10' : plan.popular ? 'bg-orange-500/10' : 'bg-white/5'
                                        }`}>
                                        <PlanIcon className={`w-5 h-5 ${isCurrentPlan ? 'text-green-500' : plan.popular ? 'text-orange-500' : 'text-zinc-400'}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                                    <p className="text-xs text-zinc-500">{plan.description}</p>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-white">{plan.currency === 'eur' ? '€' : '$'}{plan.amount}</span>
                                        <span className="text-zinc-500 text-sm">/{plan.interval}</span>
                                    </div>
                                </div>

                                <ul className="space-y-3 mb-6 flex-1">
                                    {plan.features.map((feature: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check className={`w-4 h-4 flex-shrink-0 ${isCurrentPlan ? 'text-green-500' : plan.popular ? 'text-orange-500' : 'text-zinc-600'}`} />
                                            <span className="text-xs text-zinc-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    variant={isCurrentPlan ? 'outline' : plan.popular ? 'primary' : 'outline'}
                                    className={`w-full py-4 text-sm h-10 ${isCurrentPlan ? 'border-green-500/50 text-green-400 cursor-default hover:bg-transparent' : ''}`}
                                    onClick={() => !isCurrentPlan && handlePurchase(plan)}
                                    disabled={!!isLoading || isCurrentPlan}
                                >
                                    {isLoading === plan.name ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : isCurrentPlan ? (
                                        <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Active</span>
                                    ) : profile?.subscription_status === 'active' && profile?.plan?.toLowerCase() !== 'free' ? (
                                        'Manage Subscription'
                                    ) : 'Get Started'}
                                </Button>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto mb-12">
                    {/* Single Video Card - Dynamic ID */}
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
                            <Button
                                variant="outline"
                                size="sm"
                                className="min-w-[140px] border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400 text-xs h-9"
                                onClick={() => handlePurchase(singleVideoPlan || {
                                    name: 'Single Video',
                                    id: 'price_1SrMTW3pHdaDhch3yIPQP2WZ', // Fallback
                                    credits: 75,
                                    interval: 'one_time'
                                })}
                                disabled={!!isLoading}
                            >
                                {isLoading === 'Single Video' ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : `Buy 1 Video • €${singleVideoPlan?.amount || 5}`}
                            </Button>
                        </div>
                        <div className="w-full md:w-auto flex-shrink-0">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/20 flex items-center justify-center relative mx-auto">
                                <div className="absolute inset-0 rounded-full animate-pulse bg-blue-500/5"></div>
                                <Zap className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Business Plan Card (Static) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="rounded-2xl p-0.5 bg-gradient-to-br from-white/10 via-zinc-800 to-black relative overflow-hidden group"
                    >
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

                {/* Subscriber Add-ons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-4xl mx-auto mb-8 relative"
                >
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
                                    <p className="text-lg font-bold text-white mb-1">€{topUpPlan?.amount || 3.50}</p>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={profile?.subscription_status !== 'active'}
                                        className="h-7 text-xs bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => handlePurchase(topUpPlan || {
                                            name: 'Instant Topup',
                                            id: 'price_1SrMTX3pHdaDhch33m3L4jKj', // Fallback
                                            credits: 75,
                                            interval: 'one_time'
                                        })}
                                    >
                                        Buy Now
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <BusinessContactModal
                    isOpen={isBusinessModalOpen}
                    onClose={() => setIsBusinessModalOpen(false)}
                />
            </div>
        </div>
    );
}
