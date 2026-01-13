'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { getProfile, Profile } from '@/lib/db/profiles';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error: string | null }>;
    signup: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
    loginWithGoogle: () => Promise<void>;
    loginWithOtp: (email: string) => Promise<{ error: string | null }>;
    verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
    updatePassword: (password: string) => Promise<{ error: string | null }>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    deductCreditsOptimistic: (amount: number, description?: string) => void;
    logCreditTransaction: (amount: number, type: 'add' | 'deduct', description: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasResolved = useRef(false);
    const [isMounted, setIsMounted] = useState(false);

    const refreshProfile = async () => {
        if (user) {
            const userProfile = await getProfile(user.id);
            setProfile(userProfile);
        }
    };

    // Helper to log credit transactions to database
    const logCreditTransaction = async (amount: number, type: 'add' | 'deduct', description: string) => {
        if (!user || !profile) return;

        try {
            const newBalance = type === 'add'
                ? (profile.credits || 0) + amount
                : (profile.credits || 0) - amount;

            await supabase.from('credit_transactions').insert({
                user_id: user.id,
                amount: type === 'add' ? amount : -amount,
                balance_after: newBalance,
                type,
                description
            });
        } catch (error) {
            console.error('Error logging credit transaction:', error);
        }
    };

    const deductCreditsOptimistic = (amount: number, description: string = 'Credit deduction') => {
        if (profile) {
            setProfile({ ...profile, credits: (profile.credits || 0) - amount });
            // Logic moved to server-side (API) to ensure single source of truth and avoid duplicates
            // The transaction history will update via Realtime subscription or refresh
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
        }, 4000); // Increased timeout to allow for PKCE exchange which can be slow

        // Check if we are potentially in an auth callback flow (code or hash presence)
        const isAuthFlow = window.location.search.includes('code=') || window.location.hash.includes('access_token');
        if (isAuthFlow) {
            console.log('Auth flow handling detected via URL parameters.');
        }

        // Get initial session
        if (!isSupabaseConfigured) {
            console.warn('AuthContext: Offline mode, skipping session check');
            if (!hasResolved.current) {
                hasResolved.current = true;
                setIsLoading(false);
            }
            return;
        }

        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (!hasResolved.current) {
                    // If we have a session, great.
                    // If not, BUT we suspect an auth flow (URL params), we should NOT resolve yet.
                    // We waits for onAuthStateChange to fire the SIGNED_IN event.

                    if (session) {
                        hasResolved.current = true;
                        clearTimeout(timeout);
                        setSession(session);
                        setUser(session.user);
                        getProfile(session.user.id).then(setProfile);
                        setIsLoading(false);
                    } else if (!isAuthFlow) {
                        // No session and no auth params - resolve as unauthenticated
                        hasResolved.current = true;
                        clearTimeout(timeout);
                        setIsLoading(false);
                    } else {
                        // No session yet, but params exist. Let onAuthStateChange handle it.
                        console.log('Session not found in getSession(), waiting for onAuthStateChange exchange...');
                    }
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
        let subscription: { unsubscribe: () => void } | null = null;

        if (isSupabaseConfigured) {
            const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                // Non-blocking profile fetch
                if (session?.user) {
                    getProfile(session.user.id).then(setProfile);
                } else {
                    setProfile(null);
                }

                if (!hasResolved.current) {
                    hasResolved.current = true;
                    clearTimeout(timeout);
                    setIsLoading(false);
                }
            });
            subscription = data.subscription;
        }

        setIsMounted(true); // Signal mount

        return () => {
            clearTimeout(timeout);
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        // 1. Check for Offline Mode (Prevent Network Call)
        if (!isSupabaseConfigured) {
            console.warn('⚠️ Offline Mode (No Credentials): performing Mock Login.');
            const mockUser: User = {
                id: 'mock-user-id',
                email: email,
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as User;

            const mockSession: Session = {
                access_token: 'mock-token',
                refresh_token: 'mock-refresh-token',
                expires_in: 3600,
                token_type: 'bearer',
                user: mockUser
            };

            setSession(mockSession);
            setUser(mockUser);
            setProfile({
                id: 'mock-user-id',
                name: 'Offline User',
                plan: 'Free',
                credits: 100,
                avatar_url: null,
                created_at: new Date().toISOString()
            } as Profile);
            return { error: null };
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                // If it's a fetch error, assumption is offline/missing env vars -> Fallback to Mock
                if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
                    console.warn('⚠️ Login failed due to network/env error. Enabling Offline Mock Session.');

                    const mockUser: User = {
                        id: 'mock-user-id',
                        app_metadata: {},
                        user_metadata: {},
                        aud: 'authenticated',
                        created_at: new Date().toISOString()
                    } as User;

                    const mockSession: Session = {
                        access_token: 'mock-token',
                        refresh_token: 'mock-refresh-token',
                        expires_in: 3600,
                        token_type: 'bearer',
                        user: mockUser
                    };

                    setSession(mockSession);
                    setUser(mockUser);

                    // Mock profile
                    setProfile({
                        id: 'mock-user-id',
                        name: 'Offline User',
                        plan: 'Free',
                        credits: 100,
                        avatar_url: null,
                        created_at: new Date().toISOString()
                    } as Profile);

                    return { error: null };
                }
                return { error: error.message };
            }

            return { error: null };
        } catch (err: any) {
            console.error("Login exception:", err);

            // Broad check for network/fetch errors
            const isNetworkError =
                err.message?.includes('fetch') ||
                err.message?.includes('network') ||
                err.name === 'TypeError' || // "TypeError: Failed to fetch"
                (typeof err === 'string' && err.includes('fetch'));

            if (isNetworkError) {
                console.warn('⚠️ Login exception (Offline Mode). Enabling Mock Session.');
                const mockUser: User = {
                    id: 'mock-user-id',
                    app_metadata: {},
                    user_metadata: {},
                    aud: 'authenticated',
                    created_at: new Date().toISOString()
                } as User;

                const mockSession: Session = {
                    access_token: 'mock-token',
                    refresh_token: 'mock-refresh-token',
                    expires_in: 3600,
                    token_type: 'bearer',
                    user: mockUser
                };

                setSession(mockSession);
                setUser(mockUser);
                setProfile({
                    id: 'mock-user-id',
                    name: 'Offline User',
                    plan: 'Free',
                    credits: 100,
                    avatar_url: null,
                    created_at: new Date().toISOString()
                } as Profile);
                return { error: null };
            }
            return { error: err.message || "An unexpected error occurred" };
        }
    };

    const signup = async (name: string, email: string, password: string) => {
        // 1. Check for Offline Mode
        if (!isSupabaseConfigured) {
            console.warn('⚠️ Offline Mode: performing Mock Signup.');
            const mockUser: User = {
                id: 'mock-user-id',
                email: email,
                app_metadata: {},
                user_metadata: { name },
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as User;

            const mockSession: Session = {
                access_token: 'mock-token',
                refresh_token: 'mock-refresh-token',
                expires_in: 3600,
                token_type: 'bearer',
                user: mockUser
            };

            setSession(mockSession);
            setUser(mockUser);
            setProfile({
                id: 'mock-user-id',
                name: name,
                plan: 'Free',
                credits: 100,
                avatar_url: null,
                created_at: new Date().toISOString()
            } as Profile);
            return { error: null };
        }

        try {
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
                if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
                    console.warn('⚠️ Signup failed due to network/env error. Enabling Offline Mock Session.');
                    const mockUser: User = { id: 'mock-user-id', email, app_metadata: {}, user_metadata: { name }, aud: 'authenticated', created_at: new Date().toISOString() } as User;
                    const mockSession: Session = { access_token: 'mock', refresh_token: 'mock', expires_in: 3600, token_type: 'bearer', user: mockUser };
                    setSession(mockSession);
                    setUser(mockUser);
                    setProfile({ id: 'mock-user-id', name: name, plan: 'Free', credits: 100, avatar_url: null, created_at: new Date().toISOString() } as Profile);
                    return { error: null };
                }
                return { error: error.message };
            }



            return { error: null };
        } catch (err: any) {
            console.error("Signup exception:", err);
            // Catch-all 
            if (err.message?.includes('fetch') || err.name === 'TypeError') {
                console.warn('⚠️ Signup exception (Offline Mode). Enabling Mock Session.');
                const mockUser: User = { id: 'mock-user-id', email, app_metadata: {}, user_metadata: { name }, aud: 'authenticated', created_at: new Date().toISOString() } as User;
                const mockSession: Session = { access_token: 'mock', refresh_token: 'mock', expires_in: 3600, token_type: 'bearer', user: mockUser };
                setSession(mockSession);
                setUser(mockUser);
                setProfile({ id: 'mock-user-id', name: name, plan: 'Free', credits: 100, avatar_url: null, created_at: new Date().toISOString() } as Profile);
                return { error: null };
            }
            return { error: "An unexpected error occurred" };
        }
    };

    const loginWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    const loginWithOtp = async (email: string) => {
        if (!isSupabaseConfigured) {
            console.warn('⚠️ Offline Mode: Mock OTP sent');
            return { error: null };
        }
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: false,
                emailRedirectTo: `${window.location.origin}/profile`,
            },
        });
        return { error: error?.message || null };
    };

    const verifyOtp = async (email: string, token: string) => {
        if (!isSupabaseConfigured) {
            console.warn('⚠️ Offline Mode: Mock OTP verified');
            // Mock login
            const mockUser: User = { id: 'mock-user-id', email, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } as User;
            const mockSession: Session = { access_token: 'mock', refresh_token: 'mock', expires_in: 3600, token_type: 'bearer', user: mockUser };
            setSession(mockSession);
            setUser(mockUser);
            return { error: null };
        }
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });

        if (error) return { error: error.message };

        if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
        }

        return { error: null };
    };

    const updatePassword = async (password: string) => {
        if (!isSupabaseConfigured) {
            console.warn('⚠️ Offline Mode: Mock password updated');
            return { error: null };
        }
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error?.message || null };
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
                loginWithOtp,
                verifyOtp,
                updatePassword,
                logout,
                refreshProfile,
                deductCreditsOptimistic,
                logCreditTransaction,
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
