import { createPublicClient, http } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';

// Default to Testnet for the demo
export const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
});

export const publicClientMainnet = createPublicClient({
    chain: bsc,
    transport: http()
});
