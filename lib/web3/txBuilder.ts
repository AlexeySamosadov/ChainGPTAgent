import { parseEther, parseUnits, encodeFunctionData, erc20Abi } from 'viem';
import { chainGPT } from '@/lib/chaingpt/client';

// Basic Router ABI (PancakeSwap V2 style)
const ROUTER_ABI = [
    {
        inputs: [
            { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
            { internalType: 'address[]', name: 'path', type: 'address[]' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'deadline', type: 'uint256' }
        ],
        name: 'swapExactETHForTokens',
        outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'payable',
        type: 'function'
    },
    {
        inputs: [
            { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
            { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
            { internalType: 'address[]', name: 'path', type: 'address[]' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'deadline', type: 'uint256' }
        ],
        name: 'swapExactTokensForTokens',
        outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
            { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
            { internalType: 'address[]', name: 'path', type: 'address[]' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'deadline', type: 'uint256' }
        ],
        name: 'swapExactTokensForETH',
        outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
            { internalType: 'address[]', name: 'path', type: 'address[]' }
        ],
        name: 'getAmountsOut',
        outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

// Addresses on BNB Chain
const PANCAKESWAP_ROUTER_MAINNET = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const WBNB_MAINNET = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

const PANCAKESWAP_ROUTER_TESTNET = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
const WBNB_TESTNET = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';

export interface TxDraft {
    to: `0x${string}`;
    data: `0x${string}`;
    value: bigint;
    description: string;
}

export class TxBuilder {

    buildTransfer(to: string, amount: string, tokenAddress?: string): TxDraft {
        if (!tokenAddress) {
            // Native BNB Transfer
            return {
                to: to as `0x${string}`,
                data: '0x',
                value: parseEther(amount),
                description: `Transfer ${amount} BNB to ${to}`,
            };
        } else {
            // ERC20 Transfer
            const data = encodeFunctionData({
                abi: erc20Abi,
                functionName: 'transfer',
                args: [to as `0x${string}`, parseEther(amount)], // Assuming 18 decimals for simplicity, should fetch decimals
            });
            return {
                to: tokenAddress as `0x${string}`,
                data: data,
                value: 0n,
                description: `Transfer ${amount} tokens to ${to}`,
            };
        }
    }

    async buildSwap(
        tokenIn: string,
        tokenOut: string,
        amountIn: string,
        userAddress: string,
        chainId: number = 56, // Default to Mainnet
        decimalsIn: number = 18,
        expectedAmountOut?: string,
        slippageTolerance: number = 0.03 // 3% default slippage
    ): Promise<TxDraft> {
        const ROUTER = chainId === 97 ? PANCAKESWAP_ROUTER_TESTNET : PANCAKESWAP_ROUTER_MAINNET;
        const WBNB = chainId === 97 ? WBNB_TESTNET : WBNB_MAINNET;

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 mins

        // Get actual decimals for both tokens
        const decimalsInActual = await this.getDecimals(tokenIn, chainId);
        const decimalsOut = await this.getDecimals(tokenOut, chainId);

        const amountInBig = parseUnits(amountIn, decimalsInActual);

        // Calculate amountOutMin with slippage protection
        let amountOutMin = 0n;
        if (expectedAmountOut && parseFloat(expectedAmountOut) > 0) {
            const expectedAmountOutBig = parseUnits(expectedAmountOut, decimalsOut);
            // Apply slippage tolerance (e.g., 3% = 0.97 of expected)
            amountOutMin = BigInt(Math.floor(Number(expectedAmountOutBig) * (1 - slippageTolerance)));
        }

        if (tokenIn === 'BNB') {
            const path = [WBNB, tokenOut] as `0x${string}`[];
            const data = encodeFunctionData({
                abi: ROUTER_ABI,
                functionName: 'swapExactETHForTokens',
                args: [amountOutMin, path, userAddress as `0x${string}`, deadline],
            });

            return {
                to: ROUTER as `0x${string}`,
                data,
                value: amountInBig,
                description: `Swap ${amountIn} BNB for ${tokenOut} (min: ${expectedAmountOut || '0'})`,
            };
        } else if (tokenOut === 'BNB') {
            const path = [tokenIn, WBNB] as `0x${string}`[];
            const data = encodeFunctionData({
                abi: ROUTER_ABI,
                functionName: 'swapExactTokensForETH',
                args: [amountInBig, amountOutMin, path, userAddress as `0x${string}`, deadline],
            });

            return {
                to: ROUTER as `0x${string}`,
                data,
                value: 0n,
                description: `Swap ${amountIn} ${tokenIn} for BNB (min: ${expectedAmountOut || '0'})`,
            };
        } else {
            const path = [tokenIn, tokenOut] as `0x${string}`[];
            const data = encodeFunctionData({
                abi: ROUTER_ABI,
                functionName: 'swapExactTokensForTokens',
                args: [amountInBig, amountOutMin, path, userAddress as `0x${string}`, deadline],
            });

            return {
                to: ROUTER as `0x${string}`,
                data,
                value: 0n,
                description: `Swap ${amountIn} ${tokenIn} for ${tokenOut} (min: ${expectedAmountOut || '0'})`,
            };
        }
    }

    async getSwapQuote(
        tokenIn: string,
        tokenOut: string,
        amountIn: string,
        chainId: number = 97
    ): Promise<string> {
        const ROUTER = chainId === 97 ? PANCAKESWAP_ROUTER_TESTNET : PANCAKESWAP_ROUTER_MAINNET;
        const WBNB = chainId === 97 ? WBNB_TESTNET : WBNB_MAINNET;

        // Get actual decimals for input and output tokens
        const decimalsIn = await this.getDecimals(tokenIn, chainId);
        const decimalsOut = await this.getDecimals(tokenOut, chainId);

        // Simple handling for BNB -> Token
        let path: `0x${string}`[] = [];
        if (tokenIn === 'BNB') {
            path = [WBNB as `0x${string}`, tokenOut as `0x${string}`];
        } else if (tokenOut === 'BNB') {
            path = [tokenIn as `0x${string}`, WBNB as `0x${string}`];
        } else {
            path = [tokenIn as `0x${string}`, tokenOut as `0x${string}`];
        }

        try {
            // Dynamic import to avoid circular deps if any, or just standard import
            const { publicClient } = await import('./client');

            // Use proper decimals for input amount
            const amountInBig = parseUnits(amountIn, decimalsIn);

            const amounts = await publicClient.readContract({
                address: ROUTER as `0x${string}`,
                abi: ROUTER_ABI,
                functionName: 'getAmountsOut',
                args: [amountInBig, path]
            });

            // amounts[1] is the output amount - format using correct decimals
            const amountOut = Number(amounts[1]) / (10 ** decimalsOut);
            return amountOut.toFixed(4);
        } catch (error) {
            console.error('Error fetching quote:', error);
            // Return 0 to indicate failure/no liquidity instead of lying
            return '0.0000';
        }
    }
    async estimateSwapGas(
        tokenIn: string,
        tokenOut: string,
        amountIn: string,
        userAddress: string,
        chainId: number = 97
    ): Promise<{ gasFee: string, time: string }> {
        const ROUTER = chainId === 97 ? PANCAKESWAP_ROUTER_TESTNET : PANCAKESWAP_ROUTER_MAINNET;
        const WBNB = chainId === 97 ? WBNB_TESTNET : WBNB_MAINNET;

        // Get proper decimals for input token
        const decimalsIn = await this.getDecimals(tokenIn, chainId);
        const amountInBig = parseUnits(amountIn, decimalsIn);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

        const path: `0x${string}`[] = [];
        let value = 0n;

        try {
            const { publicClient } = await import('./client');

            // 1. Get Gas Price
            const gasPrice = await publicClient.getGasPrice();

            // 2. Estimate Gas Limit
            // We use a safe default if estimation fails (common in testnets without allowance)
            let gasLimit = 200000n;
            try {
                if (tokenIn === 'BNB') {
                    const swapPath = [WBNB as `0x${string}`, tokenOut as `0x${string}`];
                    value = amountInBig;
                    gasLimit = await publicClient.estimateContractGas({
                        address: ROUTER as `0x${string}`,
                        abi: ROUTER_ABI,
                        functionName: 'swapExactETHForTokens',
                        args: [0n, swapPath, userAddress as `0x${string}`, deadline],
                        account: userAddress as `0x${string}`,
                        value: value
                    });
                } else if (tokenOut === 'BNB') {
                    const swapPath = [tokenIn as `0x${string}`, WBNB as `0x${string}`];
                    gasLimit = await publicClient.estimateContractGas({
                        address: ROUTER as `0x${string}`,
                        abi: ROUTER_ABI,
                        functionName: 'swapExactTokensForETH',
                        args: [amountInBig, 0n, swapPath, userAddress as `0x${string}`, deadline],
                        account: userAddress as `0x${string}`,
                    });
                } else {
                    const swapPath = [tokenIn as `0x${string}`, tokenOut as `0x${string}`];
                    gasLimit = await publicClient.estimateContractGas({
                        address: ROUTER as `0x${string}`,
                        abi: ROUTER_ABI,
                        functionName: 'swapExactTokensForTokens',
                        args: [amountInBig, 0n, swapPath, userAddress as `0x${string}`, deadline],
                        account: userAddress as `0x${string}`,
                    });
                }
            } catch (e) {
                console.warn('Gas estimation failed, using default', e);
            }

            // 3. Calculate Cost using policy engine's BNB price
            const gasCostWei = gasPrice * gasLimit;
            const gasCostBNB = Number(gasCostWei) / 1e18;

            // Use policy engine for consistent BNB price
            const { defaultPolicy } = await import('./policy');
            const bnbPrice = await defaultPolicy.getBNBPrice();
            const gasCostUSD = (gasCostBNB * bnbPrice).toFixed(2);

            return {
                gasFee: `$${gasCostUSD} (${gasCostBNB.toFixed(6)} BNB)`,
                time: '~15s' // BSC avg block time * confirmations
            };

        } catch (error) {
            console.error('Error estimating gas:', error);
            return { gasFee: '~$0.15 (estimate)', time: '~30s' };
        }
    }

    async checkAllowance(
        tokenAddress: string,
        owner: string,
        spender: string,
        chainId: number = 97
    ): Promise<bigint> {
        try {
            const { publicClient } = await import('./client');
            const allowance = await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'allowance',
                args: [owner as `0x${string}`, spender as `0x${string}`]
            });
            return allowance as bigint;
        } catch (error) {
            console.error('Error checking allowance:', error);
            return 0n;
        }
    }

    buildApprove(
        tokenAddress: string,
        spender: string,
        amount: string,
        decimals: number = 18
    ): TxDraft {
        const amountBig = parseUnits(amount, decimals);
        const data = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [spender as `0x${string}`, amountBig]
        });

        return {
            to: tokenAddress as `0x${string}`,
            data,
            value: 0n,
            description: `Approve ${amount} tokens for spending`
        };
    }

    async checkBalance(
        tokenAddress: string,
        account: string,
        chainId: number = 97
    ): Promise<bigint> {
        try {
            const { publicClient } = await import('./client');

            if (tokenAddress === 'BNB') {
                return await publicClient.getBalance({ address: account as `0x${string}` });
            } else {
                return await publicClient.readContract({
                    address: tokenAddress as `0x${string}`,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [account as `0x${string}`]
                }) as bigint;
            }
        } catch (error) {
            console.error('Error checking balance:', error);
            return 0n;
        }
    }

    async getDecimals(
        tokenAddress: string,
        chainId: number = 97
    ): Promise<number> {
        if (tokenAddress === 'BNB') return 18;
        try {
            const { publicClient } = await import('./client');
            const decimals = await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'decimals',
            });
            return decimals as number;
        } catch (error) {
            console.warn('Error fetching decimals, defaulting to 18:', error);
            return 18;
        }
    }
}

export const txBuilder = new TxBuilder();
