'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasRedirected = useRef(false);

    useEffect(() => {
        if (hasRedirected.current) return;

        // Check for error in URL immediately
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        if (error) {
            console.error('Auth Callback Error:', error, errorDescription);
            router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`);
            return;
        }

        console.log('🔄 Processing auth callback...');

        // Let supabase client handle the session recovery (it parses URL automatically)
        // We just verify we have a session.
        const handleAuth = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Session retrieval error:', error);
                router.push(`/login?error=${encodeURIComponent(error.message)}`);
                return;
            }

            if (session) {
                console.log('✅ Session found, redirecting to profile...');
                hasRedirected.current = true;
                router.push('/profile');
            } else {
                // Fallback: wait for event?
                // Sometimes getSession returns null immediately if hash parsing hasn't finished.
                // We rely on onAuthStateChange below.
            }
        };

        handleAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);
            if (event === 'SIGNED_IN' || session) {
                if (!hasRedirected.current) {
                    hasRedirected.current = true;
                    router.push('/profile');
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router, searchParams]);




    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm">Finishing sign in...</p>
            </div>
        </div>
    );
}
