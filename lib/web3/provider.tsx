'use client';

import React from 'react';
import {
    getDefaultConfig,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
    bsc,
    bscTestnet,
} from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const config = getDefaultConfig({
    appName: 'ChainGPT Web3 Copilot',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [bsc, bscTestnet],
    ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config= { config } >
        <QueryClientProvider client={ queryClient }>
            <RainbowKitProvider>
            { children }
            </RainbowKitProvider>
            </QueryClientProvider>
            </WagmiProvider>
    );
}
