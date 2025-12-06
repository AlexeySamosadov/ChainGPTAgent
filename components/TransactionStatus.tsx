import React, { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { SwapSuccessCard } from './SwapSuccessCard';
import { TokenSuccessCard } from './TokenSuccessCard';

interface TransactionStatusProps {
    txHash: string;
    onSuccess: () => void;
    currentPlan: any;
    currentTxDraft: any;
}

export function TransactionStatus({ txHash, onSuccess, currentPlan, currentTxDraft }: TransactionStatusProps) {
    const { data: receipt, isLoading, isError, error } = useWaitForTransactionReceipt({
        hash: txHash as `0x${string}`,
    });

    useEffect(() => {
        if (receipt?.status === 'success') {
            onSuccess();
        }
    }, [receipt, onSuccess]);

    if (isLoading) {
        return (
            <div className="w-full max-w-md mx-auto mt-4 p-6 rounded-xl border border-white/10 bg-[#1A1B1E] flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-2">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <h3 className="text-white font-bold text-lg">Processing Transaction...</h3>
                <p className="text-gray-400 text-sm mt-1">Waiting for blockchain confirmation</p>
                <a
                    href={`https://testnet.bscscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 mt-4 hover:underline"
                >
                    View on BscScan
                </a>
            </div>
        );
    }

    if (receipt?.status === 'reverted' || isError) {
        return (
            <div className="w-full max-w-md mx-auto mt-4 p-6 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-2">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-white font-bold text-lg">Transaction Failed</h3>
                <p className="text-gray-400 text-sm mt-2">
                    The transaction was reverted by the blockchain.
                </p>
                {/* Heuristic for common errors */}
                <div className="mt-4 p-3 bg-red-500/10 rounded-lg text-left w-full">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-red-200">
                            <p className="font-bold mb-1">Possible Reasons:</p>
                            <ul className="list-disc list-inside space-y-1 opacity-80">
                                <li>Insufficient Token Allowance (Did you approve USDT?)</li>
                                <li>Insufficient Balance for Gas</li>
                                <li>Slippage too high</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <a
                    href={`https://testnet.bscscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-400 mt-4 hover:underline"
                >
                    View Error on BscScan
                </a>
            </div>
        );
    }

    if (receipt?.status === 'success') {
        const isSwap = currentPlan?.steps.some((s: any) => s.type === 'swap_tokens');

        if (isSwap) {
            return (
                <SwapSuccessCard
                    txHash={txHash}
                    tokenIn={currentTxDraft?.description?.split(' ')[2] || 'BNB'}
                    tokenOut={currentTxDraft?.description?.split(' ')[4] || 'USDT'}
                    amountIn={currentTxDraft?.description?.split(' ')[1] || '0.01'}
                    amountOut={
                        // Try to find the output amount from the selected route in the plan
                        currentPlan?.steps.find((s: any) => s.type === 'swap_tokens')?.routes?.find((r: any) => r.id === currentPlan?.steps.find((s: any) => s.type === 'swap_tokens')?.selectedRouteId)?.outputAmount?.split(' ')[0]
                        || '...'
                    }
                    route={
                        currentPlan?.steps.find((s: any) => s.type === 'swap_tokens')?.routes?.find((r: any) => r.id === currentPlan?.steps.find((s: any) => s.type === 'swap_tokens')?.selectedRouteId)?.provider
                        || 'PancakeSwap'
                    }
                />
            );
        } else {
            return <TokenSuccessCard txHash={txHash} tokenName="Token" />;
        }
    }

    return null;
}
