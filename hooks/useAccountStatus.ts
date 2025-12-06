'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';

export interface AccountStatus {
    // Web3 state
    web3Address: string | undefined;
    isWeb3Connected: boolean;

    // Supabase state
    supabaseUser: ReturnType<typeof useAuth>['user'];
    supabaseProfile: ReturnType<typeof useAuth>['profile'];
    isSupabaseAuthenticated: boolean;

    // Unified state
    linkedWalletAddress: string | null;
    displayAddress: string | null;
    displayName: string;
    authMethods: ('web3' | 'email' | 'google')[];
    canLinkAccount: boolean;

    // Auth functions
    signOut: ReturnType<typeof useAuth>['signOut'];
    linkWallet: ReturnType<typeof useAuth>['linkWallet'];
    loading: boolean;
}

export function useAccountStatus(): AccountStatus {
    const { address, isConnected } = useAccount();
    const {
        user,
        profile,
        isAuthenticated,
        signOut,
        linkWallet,
        loading
    } = useAuth();

    const accountStatus = useMemo(() => {
        // Determine linked wallet address from Supabase profile
        const linkedWalletAddress = profile?.wallet_address || null;

        // Priority: linkedWalletAddress > web3Address
        const displayAddress = linkedWalletAddress || address || null;

        // Display name priority: username > email prefix > 'User'
        const displayName = profile?.username ||
            (profile?.email ? profile.email.split('@')[0] : null) ||
            (user?.email ? user.email.split('@')[0] : null) ||
            'User';

        // Determine active auth methods
        const authMethods: ('web3' | 'email' | 'google')[] = [];

        if (isConnected) {
            authMethods.push('web3');
        }

        if (user) {
            // Check if user signed in via Google (app_metadata.provider)
            const provider = user.app_metadata?.provider;
            if (provider === 'google') {
                authMethods.push('google');
            } else if (user.email && !user.email.includes('@wallet.chaingpt.agent')) {
                authMethods.push('email');
            }
        }

        // Can link account: web3 is connected AND Supabase is authenticated AND wallet not yet linked
        const canLinkAccount = isConnected &&
            isAuthenticated &&
            !!address &&
            linkedWalletAddress !== address;

        return {
            // Web3 state
            web3Address: address,
            isWeb3Connected: isConnected,

            // Supabase state
            supabaseUser: user,
            supabaseProfile: profile,
            isSupabaseAuthenticated: isAuthenticated,

            // Unified state
            linkedWalletAddress,
            displayAddress,
            displayName,
            authMethods,
            canLinkAccount,

            // Auth functions
            signOut,
            linkWallet,
            loading,
        };
    }, [address, isConnected, user, profile, isAuthenticated, signOut, linkWallet, loading]);

    return accountStatus;
}
