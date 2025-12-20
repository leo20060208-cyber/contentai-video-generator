'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { getOrCreateProfile, Profile } from '@/lib/db/profiles';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error: string | null }>;
    signup: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
    loginWithGoogle: (nextPath?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasResolved = useRef(false);

    const refreshProfile = async () => {
        if (user) {
            const userProfile = await getOrCreateProfile({ userId: user.id, user });
            setProfile(userProfile);
        }
    };

    useEffect(() => {
        // Timeout to prevent infinite loading
        const timeout = setTimeout(() => {
            if (!hasResolved.current) {
                console.warn('Auth timeout - proceeding without session');
                hasResolved.current = true;
                setIsLoading(false);
            }
        }, 3000); // Reduced to 3s

        // Get initial session
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (!hasResolved.current) {
                    hasResolved.current = true;
                    // Keep timeout to avoid race conditions if onAuthStateChange fires same time
                    clearTimeout(timeout);

                    setSession(session);
                    setUser(session?.user ?? null);

                    if (session?.user) {
                        // Non-blocking profile fetch
                        getOrCreateProfile({ userId: session.user.id, user: session.user }).then(setProfile);
                    }

                    setIsLoading(false);
                }
            })
            .catch((error) => {
                console.error('Auth session error:', error);
                if (!hasResolved.current) {
                    hasResolved.current = true;
                    clearTimeout(timeout);
                    setIsLoading(false);
                }
            });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Determine if we should update loading state
                // If this is the FIRST time we hear from auth and getSession hasn't resolved, 
                // we should handle it.

                setSession(session);
                setUser(session?.user ?? null);

                // Non-blocking profile fetch
                if (session?.user) {
                    getOrCreateProfile({ userId: session.user.id, user: session.user }).then(setProfile);
                } else {
                    setProfile(null);
                }

                if (!hasResolved.current) {
                    hasResolved.current = true;
                    clearTimeout(timeout);
                    setIsLoading(false);
                }
            }
        );

        return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { error: error.message };
        }

        return { error: null };
    };

    const signup = async (name: string, email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                },
            },
        });

        if (error) {
            return { error: error.message };
        }

        // Create profile manually after signup
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    name: name,
                    plan: 'Free',
                }, { onConflict: 'id' });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Don't fail signup if profile creation fails
            }
        }

        return { error: null };
    };

    const loginWithGoogle = async (nextPath?: string) => {
        const next = nextPath && nextPath.trim().length > 0 ? nextPath : '/profile';
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
        });
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                session,
                isLoading,
                login,
                signup,
                loginWithGoogle,
                logout,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
