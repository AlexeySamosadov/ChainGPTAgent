import { NextResponse } from 'next/server';

// Q402 Facilitator Health Check
export async function GET() {
    const sponsorKey = process.env.SPONSOR_PRIVATE_KEY || process.env.FACILITATOR_PRIVATE_KEY;

    // Get facilitator address from private key if available
    let facilitatorAddress: string | undefined;
    if (sponsorKey) {
        try {
            const { privateKeyToAccount } = await import('viem/accounts');
            const account = privateKeyToAccount(sponsorKey as `0x${string}`);
            facilitatorAddress = account.address;
        } catch (error) {
            console.error('Could not derive facilitator address:', error);
        }
    }

    return NextResponse.json({
        status: sponsorKey ? 'ok' : 'not_configured',
        facilitator: facilitatorAddress,
        networks: {
            'bsc-mainnet': !!process.env.RPC_URL_BSC_MAINNET,
            'bsc-testnet': !!process.env.RPC_URL_BSC_TESTNET,
        },
        version: '0.1.0',
    });
}