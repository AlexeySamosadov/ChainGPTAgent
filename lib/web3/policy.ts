import { formatEther } from 'viem';

export interface PolicyConfig {
    maxDailySpend: number; // in BNB/USD equivalent
    maxTxAmount: number;
    allowedContracts: string[]; // Whitelist
    deniedContracts: string[]; // Blacklist
    allowedTokens?: string[]; // Token whitelist for ERC20 operations
}

export interface PolicyCheckResult {
    allowed: boolean;
    reason?: string;
}

/**
 * Get current BNB price from a reliable source
 * Fallback chain: CoinGecko API → hardcoded conservative estimate
 */
async function getBNBPrice(): Promise<number> {
    try {
        // Use CoinGecko public API (no key required for basic usage)
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd',
            { next: { revalidate: 300 } } // Cache for 5 minutes
        );

        if (response.ok) {
            const data = await response.json();
            const price = data?.binancecoin?.usd;
            if (price && typeof price === 'number' && price > 0) {
                return price;
            }
        }
    } catch (error) {
        console.warn('Failed to fetch BNB price from CoinGecko:', error);
    }

    // Conservative fallback - prevents underestimating transaction costs
    console.warn('Using fallback BNB price of $650');
    return 650;
}

export class PolicyEngine {
    private config: PolicyConfig;
    private dailySpend: number = 0;
    private lastReset: number = Date.now();
    private bnbPriceCache: { price: number; timestamp: number } | null = null;
    private readonly PRICE_CACHE_MS = 5 * 60 * 1000; // 5 minutes

    constructor(config: PolicyConfig) {
        this.config = config;
    }

    /**
     * Get BNB price with caching
     */
    async getBNBPrice(): Promise<number> {
        const now = Date.now();
        if (this.bnbPriceCache && (now - this.bnbPriceCache.timestamp) < this.PRICE_CACHE_MS) {
            return this.bnbPriceCache.price;
        }

        const price = await getBNBPrice();
        this.bnbPriceCache = { price, timestamp: now };
        return price;
    }

    /**
     * Check transaction against policy
     * Supports both native BNB and ERC20 token transfers
     */
    async checkTx(
        to: string,
        value: bigint,
        options?: {
            token?: string;
            bnbPrice?: number;
        }
    ): Promise<PolicyCheckResult> {
        this.resetDailyIfNeeded();

        const valueEth = parseFloat(formatEther(value));
        const bnbPrice = options?.bnbPrice ?? await this.getBNBPrice();

        // 1. Check Blacklist
        if (this.config.deniedContracts.includes(to.toLowerCase())) {
            return { allowed: false, reason: 'Contract is in the deny list.' };
        }

        // 2. Check Token Whitelist (if specified)
        if (options?.token && this.config.allowedTokens && this.config.allowedTokens.length > 0) {
            if (!this.config.allowedTokens.includes(options.token.toLowerCase())) {
                return { allowed: false, reason: `Token ${options.token} is not in the allowed tokens list.` };
            }
        }

        // 3. Check Whitelist (if not empty)
        if (this.config.allowedContracts.length > 0 && !this.config.allowedContracts.includes(to.toLowerCase())) {
            return { allowed: false, reason: 'Contract is not in the allow list.' };
        }

        // 4. Check Max Tx Amount (in BNB)
        if (valueEth > this.config.maxTxAmount) {
            const valueUSD = valueEth * bnbPrice;
            return {
                allowed: false,
                reason: `Transaction amount ${valueEth.toFixed(4)} BNB (~$${valueUSD.toFixed(2)}) exceeds limit of ${this.config.maxTxAmount} BNB.`
            };
        }

        // 5. Check Daily Spend (in BNB)
        if (this.dailySpend + valueEth > this.config.maxDailySpend) {
            return {
                allowed: false,
                reason: `Daily spend limit exceeded. Current: ${this.dailySpend.toFixed(4)} BNB, Attempting: ${valueEth.toFixed(4)} BNB, Limit: ${this.config.maxDailySpend} BNB`
            };
        }

        return { allowed: true };
    }

    recordTx(value: bigint) {
        this.dailySpend += parseFloat(formatEther(value));
    }

    getDailySpend(): number {
        this.resetDailyIfNeeded();
        return this.dailySpend;
    }

    private resetDailyIfNeeded() {
        const now = Date.now();
        if (now - this.lastReset > 24 * 60 * 60 * 1000) {
            this.dailySpend = 0;
            this.lastReset = now;
        }
    }
}

// Default policy
export const defaultPolicy = new PolicyEngine({
    maxDailySpend: 10, // 10 BNB
    maxTxAmount: 5,    // 5 BNB
    allowedContracts: [], // Empty = allow all except denied
    deniedContracts: [
        '0x0000000000000000000000000000000000000000', // Null address
        // Add known malicious contracts here
    ],
});
