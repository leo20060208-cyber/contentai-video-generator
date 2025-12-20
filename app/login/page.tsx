'use client';

import { motion } from 'framer-motion';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';

function LoginPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, loginWithGoogle } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(email, password);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            const next = searchParams.get('next') ?? '/profile';
            router.push(next);
        }
    };

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            const next = searchParams.get('next') ?? '/profile';
            await loginWithGoogle(next);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Google sign-in failed';
            setError(msg);
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 pt-14">
            <div className="w-full max-w-md">

                {/* Login Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 shadow-xl"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
                        <p className="text-zinc-400">Sign in to continue creating viral videos</p>
                    </div>

                    {/* Google Login */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isGoogleLoading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-medium hover:bg-zinc-700 transition-colors mb-6 disabled:opacity-50"
                    >
                        {isGoogleLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        Continue with Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-700" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 bg-zinc-900 text-xs text-zinc-500">or continue with email</span>
                        </div>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs text-zinc-400 mb-2">Email</label>
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

                        <div>
                            <label className="block text-xs text-zinc-400 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-orange-500/50 text-white placeholder:text-zinc-500 focus:outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-orange-500 focus:ring-orange-500" />
                                <span className="text-sm text-zinc-400">Remember me</span>
                            </label>
                            <a href="#" className="text-sm text-orange-500 hover:underline">Forgot password?</a>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-zinc-400 text-sm mt-6">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-orange-500 hover:underline font-medium">
                            Sign up free
                        </Link>
                    </p>
                </motion.div>

                {/* Features */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 text-center"
                >
                    <div className="flex items-center justify-center gap-6 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-orange-500" />
                            AI-powered
                        </span>
                        <span>•</span>
                        <span>No credit card required</span>
                        <span>•</span>
                        <span>Cancel anytime</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
            <LoginPageInner />
        </Suspense>
    );
}
