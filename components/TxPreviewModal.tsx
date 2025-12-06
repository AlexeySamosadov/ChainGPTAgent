import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, X, Loader2 } from 'lucide-react';

interface TxPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (useQuack: boolean) => void;
    txDraft: any;
    riskLevel: 'low' | 'medium' | 'high';
    isSigning: boolean;
    gasFee?: string;
}

export function TxPreviewModal({ isOpen, onClose, onConfirm, txDraft, riskLevel, isSigning, gasFee }: TxPreviewModalProps) {
    const [useQuack, setUseQuack] = React.useState(false);

    if (!isOpen || !txDraft) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0F] shadow-2xl shadow-purple-500/10">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 p-6 border-b border-white/10 bg-white/5">
                    <p className="text-white text-2xl font-bold leading-tight">Transaction Preview</p>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col gap-6 p-6">
                    {/* Action Summary */}
                    <div className="flex flex-col items-stretch justify-start rounded-lg border border-white/10 bg-white/5 p-4">
                        <p className="text-white text-lg font-bold leading-tight mb-1">Action: {txDraft?.description || 'Unknown Transaction'}</p>
                        <p className="text-gray-400 text-base">You are about to sign a transaction on BNB Chain.</p>
                    </div>

                    {/* Risk Meter */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-400">Risk Assessment</p>
                            <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${riskLevel === 'high' ? 'bg-[#DC143C]/20 text-[#DC143C]' :
                                riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                                    'bg-[#00FF85]/20 text-[#00FF85]'
                                }`}>
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${riskLevel === 'high' ? 'bg-[#DC143C]' :
                                        riskLevel === 'medium' ? 'bg-yellow-500' :
                                            'bg-[#00FF85]'
                                        }`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${riskLevel === 'high' ? 'bg-[#DC143C]' :
                                        riskLevel === 'medium' ? 'bg-yellow-500' :
                                            'bg-[#00FF85]'
                                        }`}></span>
                                </span>
                                {riskLevel.toUpperCase()} RISK
                            </div>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                            <div
                                className={`h-2.5 rounded-full transition-all duration-1000 ${riskLevel === 'high' ? 'bg-[#DC143C]' :
                                    riskLevel === 'medium' ? 'bg-yellow-500' :
                                        'bg-[#00FF85]'
                                    }`}
                                style={{ width: riskLevel === 'high' ? '90%' : riskLevel === 'medium' ? '50%' : '10%' }}
                            ></div>
                        </div>
                        <p className="text-gray-400 text-sm">
                            {riskLevel === 'high'
                                ? 'This transaction interacts with an unverified contract. Proceed with extreme caution.'
                                : 'Standard transaction detected. Always verify details before signing.'}
                        </p>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col divide-y divide-white/10 border-t border-b border-white/10">
                        <div className="flex justify-between items-center py-3.5">
                            <p className="text-gray-400 text-sm">To</p>
                            <p className="text-white text-sm font-mono">{txDraft?.to?.slice(0, 6)}...{txDraft?.to?.slice(-4)}</p>
                        </div>
                        <div className="flex justify-between items-center py-3.5">
                            <p className="text-gray-400 text-sm">Value</p>
                            <p className="text-white text-sm font-mono">{txDraft?.value ? (Number(txDraft.value) / 1e18).toFixed(4) : '0'} BNB</p>
                        </div>
                        {gasFee && (
                            <div className="flex justify-between items-center py-3.5">
                                <p className="text-gray-400 text-sm">Est. Gas Fee</p>
                                <p className="text-white text-sm font-mono">{gasFee}</p>
                            </div>
                        )}
                    </div>

                    {/* Gas Payment Method */}
                    <div className="flex flex-col gap-3 p-4 rounded-lg border border-white/10 bg-white/5">
                        <p className="text-white text-sm font-semibold">Gas Payment Method</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setUseQuack(false)}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    !useQuack
                                        ? 'bg-[#00FF85] text-black'
                                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                }`}
                            >
                                My Wallet
                            </button>
                            <button
                                onClick={() => setUseQuack(true)}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    useQuack
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                }`}
                            >
                                🦆 Q402 Sponsor
                            </button>
                        </div>
                        <p className="text-gray-400 text-xs">
                            {useQuack
                                ? 'Gas fees will be paid by the Q402 sponsor wallet on BNB testnet. Spend caps and policies apply.'
                                : 'You will pay gas fees from your connected wallet.'}
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 rounded-lg bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => onConfirm(useQuack)}
                            disabled={isSigning}
                            className={`flex-1 h-12 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 ${
                                useQuack ? 'bg-purple-500 text-white' : 'bg-[#00FF85] text-black'
                            }`}
                        >
                            {isSigning ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Signing...
                                </>
                            ) : (
                                <>
                                    {useQuack ? '🦆 Sign with Q402' : 'Confirm & Sign'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
