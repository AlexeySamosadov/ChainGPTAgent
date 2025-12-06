import React from 'react';
import { Coins, Check, AlertCircle } from 'lucide-react';

interface TokenOption {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    balance?: number;
}

interface TokenSelectionCardProps {
    tokens: TokenOption[];
    onSelect: (address: string) => void;
}

export function TokenSelectionCard({ tokens, onSelect }: TokenSelectionCardProps) {
    return (
        <div className="w-full max-w-md mx-auto mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium text-gray-400">Select Token</span>
                <span className="text-xs text-gray-500">Multiple matches found</span>
            </div>

            {tokens.map((token) => {
                const hasBalance = (token.balance || 0) > 0;
                return (
                    <button
                        key={token.address}
                        onClick={() => onSelect(token.address)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group ${hasBalance
                                ? 'bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40'
                                : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black/40 border border-white/5`}>
                                <Coins size={18} className={hasBalance ? "text-blue-400" : "text-gray-500"} />
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold">{token.symbol}</span>
                                    <span className="text-xs text-gray-500 font-mono">{token.address.slice(0, 6)}...{token.address.slice(-4)}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                    {token.name}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className={`font-mono font-bold text-lg ${hasBalance ? 'text-white' : 'text-gray-500'}`}>
                                {token.balance?.toFixed(4) || '0.00'}
                            </div>
                            <div className="text-xs text-gray-500">
                                Balance
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
