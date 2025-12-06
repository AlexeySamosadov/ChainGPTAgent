import React from 'react';
import { CheckCircle2, ExternalLink, Copy, Share2 } from 'lucide-react';

interface TokenSuccessCardProps {
    txHash: string;
    tokenName?: string;
    network?: 'Mainnet' | 'Testnet';
}

export function TokenSuccessCard({ txHash, tokenName = 'New Token', network = 'Testnet' }: TokenSuccessCardProps) {
    const explorerUrl = network === 'Mainnet'
        ? `https://bscscan.com/tx/${txHash}`
        : `https://testnet.bscscan.com/tx/${txHash}`;

    return (
        <div className="w-full max-w-md mx-auto mt-6 p-1 rounded-2xl bg-gradient-to-br from-green-400 to-blue-500 shadow-2xl shadow-green-500/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[#0A0A0F] rounded-xl p-6 relative overflow-hidden">
                {/* Confetti / Background Effect */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(0,255,127,0.2)_0%,transparent_60%)] animate-pulse"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4 ring-4 ring-green-500/10">
                        <CheckCircle2 size={32} className="text-green-500" />
                    </div>

                    <h2 className="text-2xl font-black text-white mb-1">Success!</h2>
                    <p className="text-gray-400 mb-6">Your token <span className="text-white font-bold">{tokenName}</span> has been deployed.</p>

                    <div className="w-full bg-white/5 rounded-lg p-4 border border-white/10 mb-6">
                        <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-gray-500">Transaction Hash</span>
                            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                                View on BscScan <ExternalLink size={12} />
                            </a>
                        </div>
                        <div className="flex items-center justify-between bg-black/30 rounded px-3 py-2">
                            <code className="text-xs text-gray-300 font-mono truncate max-w-[200px]">{txHash}</code>
                            <button
                                onClick={() => navigator.clipboard.writeText(txHash)}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => window.open(explorerUrl, '_blank')}
                            className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors text-sm"
                        >
                            View Details
                        </button>
                        <button className="flex-1 py-3 rounded-xl bg-green-500 text-black font-bold hover:bg-green-400 transition-colors text-sm flex items-center justify-center gap-2">
                            <Share2 size={16} />
                            Share
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
