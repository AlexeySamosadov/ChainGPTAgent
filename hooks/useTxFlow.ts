import { useState } from 'react';
import { useWalletClient, useSendTransaction } from 'wagmi';
import { quackClient } from '@/lib/web3/quack';

export function useTxFlow() {
    const { data: walletClient } = useWalletClient();
    const { sendTransactionAsync } = useSendTransaction();
    const [isSigning, setIsSigning] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    const signAndSend = async (txDraft: any, useQuack: boolean = false) => {
        if (!walletClient) {
            alert('Please connect your wallet');
            return;
        }

        setIsSigning(true);
        setTxHash(null);

        try {
            if (useQuack) {
                // Quack Sign-to-Pay Flow
                const result = await quackClient.signAndExecute(
                    walletClient,
                    walletClient.account.address,
                    {
                        to: txDraft.to,
                        data: txDraft.data,
                        value: BigInt(txDraft.value),
                        chainId: txDraft.chainId || 56 // Use txDraft chainId if available, fallback to 56
                    }
                );
                if (result.success && result.txHash) {
                    setTxHash(result.txHash);
                    return result.txHash;
                } else if (!result.success) {
                    throw new Error(result.error || 'Q402 transaction failed');
                }
            } else {
                // Standard Wallet Flow
                const hash = await sendTransactionAsync({
                    to: txDraft.to,
                    data: txDraft.data,
                    value: BigInt(txDraft.value),
                });
                setTxHash(hash);
                return hash;
            }
        } catch (error) {
            console.error('Tx Failed:', error);
            throw error;
        } finally {
            setIsSigning(false);
        }
    };

    return {
        signAndSend,
        isSigning,
        txHash,
    };
}
