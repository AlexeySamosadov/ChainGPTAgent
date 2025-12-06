'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/supabase/types';

interface AuthState {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    error: AuthError | null;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        session: null,
        loading: true,
        error: null,
    });

    const supabase = getSupabaseClient();

    // Fetch user profile
    const fetchProfile = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data as Profile;
    }, [supabase]);

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            try {
                console.log('[Auth] Initializing auth...');

                // Check for OAuth callback in URL (code parameter)
                if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    const code = url.searchParams.get('code');
                    if (code) {
                        console.log('[Auth] OAuth code detected, exchanging...');
                        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                        if (error) {
                            console.error('[Auth] Code exchange error:', error);
                        } else {
                            console.log('[Auth] Code exchange successful:', data.user?.email);
                            // Clean URL
                            window.history.replaceState({}, '', window.location.pathname);
                        }
                    }
                }

                const { data: { session }, error } = await supabase.auth.getSession();
                console.log('[Auth] Session:', session?.user?.email || 'none', error?.message || '');

                if (error) {
                    setState(prev => ({ ...prev, error, loading: false }));
                    return;
                }

                if (session?.user) {
                    console.log('[Auth] User found:', session.user.email);
                    const profile = await fetchProfile(session.user.id);
                    console.log('[Auth] Profile:', profile);
                    setState({
                        user: session.user,
                        profile,
                        session,
                        loading: false,
                        error: null,
                    });
                } else {
                    console.log('[Auth] No session');
                    setState(prev => ({ ...prev, loading: false }));
                }
            } catch (err) {
                console.error('Auth init error:', err);
                setState(prev => ({ ...prev, loading: false }));
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    setState({
                        user: session.user,
                        profile,
                        session,
                        loading: false,
                        error: null,
                    });
                } else {
                    setState({
                        user: null,
                        profile: null,
                        session: null,
                        loading: false,
                        error: null,
                    });
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    // Sign up with email
    const signUp = async (email: string, password: string, username?: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                },
            },
        });

        if (error) {
            setState(prev => ({ ...prev, error, loading: false }));
            return { error };
        }

        return { data };
    };

    // Sign in with email
    const signIn = async (email: string, password: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setState(prev => ({ ...prev, error, loading: false }));
            return { error };
        }

        return { data };
    };

    // Sign in with Google
    const signInWithGoogle = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: typeof window !== 'undefined'
                    ? `${window.location.origin}/`
                    : undefined,
            },
        });

        if (error) {
            setState(prev => ({ ...prev, error, loading: false }));
            return { error };
        }

        return { data };
    };

    // Sign in with wallet (using message signing)
    // DEPRECATED: This method is kept for backward compatibility with existing wallet-based accounts
    // (email format: address@wallet.chaingpt.agent). New users should connect their wallet via
    // RainbowKit's ConnectButton and then link it to their Supabase profile using linkWallet().
    const signInWithWallet = async (walletAddress: string, signMessage: (message: string) => Promise<string>) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Create a nonce for signing
            const nonce = `Sign in to ChainGPT Agent\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;

            // Get signature from wallet
            const signature = await signMessage(nonce);

            // Use the signature as password (deterministic for same wallet)
            const email = `${walletAddress.toLowerCase()}@wallet.chaingpt.com`;

            // Try to sign in first
            let { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: signature.slice(0, 72), // Supabase password limit
            });

            // If user doesn't exist, sign up
            if (error?.message?.includes('Invalid login credentials')) {
                const signUpResult = await supabase.auth.signUp({
                    email,
                    password: signature.slice(0, 72),
                    options: {
                        data: {
                            wallet_address: walletAddress,
                        },
                    },
                });

                if (signUpResult.error) {
                    setState(prev => ({ ...prev, error: signUpResult.error, loading: false }));
                    return { error: signUpResult.error };
                }

                // Update profile with wallet address
                if (signUpResult.data.user) {
                    await (supabase
                        .from('profiles') as any)
                        .update({ wallet_address: walletAddress })
                        .eq('id', signUpResult.data.user.id);
                }

                return { data: signUpResult.data };
            }

            if (error) {
                setState(prev => ({ ...prev, error, loading: false }));
                return { error };
            }

            // Update wallet address in profile if needed
            if (data.user) {
                await (supabase
                    .from('profiles') as any)
                    .update({ wallet_address: walletAddress })
                    .eq('id', data.user.id);
            }

            return { data };
        } catch (err: any) {
            const error = { message: err.message } as AuthError;
            setState(prev => ({ ...prev, error, loading: false }));
            return { error };
        }
    };

    // Sign out
    const signOut = async () => {
        setState(prev => ({ ...prev, loading: true }));
        const { error } = await supabase.auth.signOut();

        if (error) {
            setState(prev => ({ ...prev, error, loading: false }));
            return { error };
        }

        setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
        });

        return { error: null };
    };

    // Update profile
    const updateProfile = async (updates: Partial<Profile>) => {
        if (!state.user) return { error: { message: 'Not authenticated' } };

        const { data, error } = await (supabase
            .from('profiles') as any)
            .update(updates)
            .eq('id', state.user.id)
            .select()
            .single();

        if (error) {
            return { error };
        }

        setState(prev => ({ ...prev, profile: data as Profile }));
        return { data };
    };

    // Link wallet to existing account
    const linkWallet = async (walletAddress: string) => {
        if (!state.user) return { error: { message: 'Not authenticated' } };

        return updateProfile({ wallet_address: walletAddress });
    };

    return {
        ...state,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithWallet,
        signOut,
        updateProfile,
        linkWallet,
        isAuthenticated: !!state.user,
    };
}