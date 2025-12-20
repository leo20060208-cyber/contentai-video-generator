'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [message, setMessage] = useState<string>('Signing you in…');

    useEffect(() => {
        const run = async () => {
            const code = searchParams.get('code');
            const next = searchParams.get('next') ?? '/profile';

            if (!code) {
                router.replace('/login?error=Could not authenticate');
                return;
            }

            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
                router.replace('/login?error=Could not authenticate');
                return;
            }

            setMessage('Redirecting…');
            router.replace(next);
        };

        void run();
    }, [router, searchParams]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="text-zinc-400">{message}</p>
            </div>
        </div>
    );
}

