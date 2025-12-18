'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Sparkles,
    User,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';

const features = [
    'Create viral product videos in seconds',
    'Access to 100+ templates',
    'AI-powered video generation',
    'No editing skills required',
];

export default function SignupPage() {
    const router = useRouter();
    const { signup, loginWithGoogle } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await signup(name, email, password);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            setSuccess(true);
            setTimeout(() => {
                router.push('/profile');
            }, 1500);
        }
    };

    const handleGoogleSignup = async () => {
        setIsGoogleLoading(true);
        await loginWithGoogle();
    };

    if (success) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Account created!</h2>
                    <p className="text-zinc-400">Redirecting to your profile...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 pt-14">
            <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">

                {/* Left: Benefits */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hidden md:block"
                >
                    <h2 className="text-3xl font-bold text-white mb-6">
                        Start creating <span className="text-orange-500">viral videos</span> today
                    </h2>
                    <ul className="space-y-4">
                        {features.map((feature, i) => (
                            <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * i }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                    <Check className="w-4 h-4 text-orange-500" />
                                </div>
                                <span className="text-zinc-300">{feature}</span>
                            </motion.li>
                        ))}
                    </ul>

                    <div className="mt-8 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold">
                                S
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">Sarah Johnson</p>
                                <p className="text-xs text-zinc-500">@sarahj • Fashion Brand</p>
                            </div>
                        </div>
                        <p className="text-zinc-400 text-sm">
                            &quot;ContentAI helped us increase our social media engagement by 300%. The AI-generated videos are incredible!&quot;
                        </p>
                    </div>
                </motion.div>

                {/* Right: Signup Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 shadow-xl"
                >

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
                        <p className="text-zinc-400">Start your free trial, no credit card required</p>
                    </div>

                    {/* Google Signup */}
                    <button
                        onClick={handleGoogleSignup}
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

                    {/* Signup Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs text-zinc-400 mb-2">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    required
                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-orange-500/50 text-white placeholder:text-zinc-500 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

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
                                    minLength={8}
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
                            <p className="text-xs text-zinc-500 mt-1">Must be at least 8 characters</p>
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
                                    Creating account...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Create Account
                                    <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>

                        <p className="text-xs text-zinc-500 text-center">
                            By signing up, you agree to our{' '}
                            <a href="#" className="text-orange-500 hover:underline">Terms</a>
                            {' '}and{' '}
                            <a href="#" className="text-orange-500 hover:underline">Privacy Policy</a>
                        </p>
                    </form>

                    <p className="text-center text-zinc-400 text-sm mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="text-orange-500 hover:underline font-medium">
                            Sign in
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
