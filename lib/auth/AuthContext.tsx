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
            const userProfile = await getProfile(user.id);
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
        }, 1000); // Reduced to 1s for snappier navigation

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
                    hasResolved.current = true;
                    // Keep timeout to avoid race conditions if onAuthStateChange fires same time
                    clearTimeout(timeout);

                    setSession(session);
                    setUser(session?.user ?? null);

                    if (session?.user) {
                        // Non-blocking profile fetch
                        getProfile(session.user.id).then(setProfile);
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
                }
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
