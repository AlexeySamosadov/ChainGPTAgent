import { formatEther, parseAbi } from 'viem';
import { defaultPolicy } from '@/lib/web3/policy';

export interface PortfolioRisk {
    totalValue: number;
    riskScore: number; // 0-100 (100 = high risk)
    riskyAssets: Array<{
        token: string;
        reason: string;
    }>;
    assets: Array<{
        token: string;
        address: string;
        balance: string;
        valueUsd: number;
    }>;
}

const ERC20_ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)'
]);

// Known Testnet Addresses
const USDT_TESTNET = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';

export class PortfolioGuardian {
    async analyze(userAddress: string, chainId: number = 97): Promise<PortfolioRisk> {
        // Validate address format
        if (!userAddress || !userAddress.startsWith('0x') || userAddress.length !== 42) {
            return {
                totalValue: 0,
                riskScore: 0,
                riskyAssets: [{ token: 'Wallet', reason: 'Please connect your wallet to analyze portfolio.' }],
                assets: []
            };
        }

        try {
            // Dynamic import to avoid circular deps
            const { publicClient } = await import('@/lib/web3/client');

            // 1. Fetch BNB Balance
            const bnbBalanceWei = await publicClient.getBalance({ address: userAddress as `0x${string}` });
            const bnbBalance = parseFloat(formatEther(bnbBalanceWei));

            // Use deterministic price source from policy engine (CoinGecko with fallback)
            let bnbPrice: number;
            let priceApproximate = false;
            try {
                bnbPrice = await defaultPolicy.getBNBPrice();
            } catch (error) {
                console.warn('Failed to fetch BNB price, using conservative fallback:', error);
                bnbPrice = 650; // Conservative fallback
                priceApproximate = true;
            }
            const bnbValue = bnbBalance * bnbPrice;

            // 2. Fetch USDT Balance
            let usdtBalance = 0;
            try {
                const balance = await publicClient.readContract({
                    address: USDT_TESTNET,
                    abi: ERC20_ABI,
                    functionName: 'balanceOf',
                    args: [userAddress as `0x${string}`]
                });
                usdtBalance = Number(balance) / 1e18; // Assuming 18 decimals
            } catch (e) {
                console.warn('Failed to fetch USDT balance', e);
            }
            const usdtValue = usdtBalance * 1; // Stablecoin

            // 3. Calculate Risk Score (Real Logic)
            let riskScore = 10; // Base risk
            const riskyAssets = [];

            // Note if price is approximate
            if (priceApproximate) {
                riskyAssets.push({ token: 'BNB', reason: 'Price is approximate (fallback value used).' });
            }

            // Rule 1: Low Native Balance (Dust Wallet)
            if (bnbBalance < 0.01) {
                riskScore += 30;
                riskyAssets.push({ token: 'BNB', reason: 'Low native balance for gas.' });
            }

            // Rule 2: High Concentration? (Simple check)
            if (bnbValue > 0 && usdtValue === 0) {
                riskScore += 10; // Only holds BNB
            }

            const totalValue = bnbValue + usdtValue;

            return {
                totalValue,
                riskScore: Math.min(riskScore, 100),
                riskyAssets,
                assets: [
                    { token: 'BNB', address: 'Native', balance: bnbBalance.toFixed(4), valueUsd: bnbValue },
                    { token: 'USDT', address: USDT_TESTNET, balance: usdtBalance.toFixed(2), valueUsd: usdtValue }
                ]
            };

        } catch (error) {
            console.error('Portfolio Analysis Failed:', error);
            return {
                totalValue: 0,
                riskScore: 0,
                riskyAssets: [{ token: 'Error', reason: 'Failed to fetch on-chain data' }],
                assets: []
            };
        }
    }
}

export const portfolioGuardian = new PortfolioGuardian();
