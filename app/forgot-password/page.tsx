'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { loginWithOtp, verifyOtp } = useAuth();

    const [step, setStep] = useState<'email' | 'success'>('email');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await loginWithOtp(email);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            setStep('success');
            setIsLoading(false);
        }
    };



    return (
        <div className="min-h-screen flex items-center justify-center px-4 pt-14">
            <div className="w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}

                    className="bg-black/60 backdrop-blur-md rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 p-32 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative">
                        <Link href="/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-6 text-sm transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </Link>

                        <div className="text-center mb-8">
                            <div className="flex items-center justify-center mx-auto mb-4">
                                <KeyRound className="w-8 h-8 text-orange-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">
                                {step === 'email' ? 'Forgot Password?' : 'Check your email'}
                            </h1>
                            <p className="text-zinc-400">
                                {step === 'email'
                                    ? "Don't worry, it happens to the best of us."
                                    : `We sent a login link to ${email}`}
                            </p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm text-center"
                            >
                                <p>Log in via the link sent to your email.</p>
                                <p className="mt-2 text-xs opacity-70">Once logged in, you can update your password in your profile.</p>
                            </motion.div>
                        )}

                        {step === 'email' ? (
                            <form onSubmit={handleSendCode} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-orange-500/50 text-white placeholder:text-zinc-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full !rounded-sm !bg-orange-500 hover:!bg-orange-600 border-none uppercase tracking-wide font-bold text-xs"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending Code...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Send Code
                                            <ArrowRight className="w-4 h-4" />
                                        </span>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => router.push('/login')}
                                >
                                    Back to Login
                                </Button>
                                <p className="text-center mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep('email')}
                                        className="text-xs text-orange-500 hover:text-orange-400"
                                    >
                                        Try another email
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div >
            </div >
        </div >
    );
}
