import React, { useState } from 'react';
import { CheckCircle2, ArrowUpRight, Clock, Trash2, Code, Shield, Coins, ArrowRightLeft, ChevronDown, ChevronUp, Copy, Check, Loader2, CloudOff, Cloud } from 'lucide-react';
import { useHistory, HistoryItem as LocalHistoryItem } from '@/hooks/useHistory';
import { useSupabaseHistory } from '@/hooks/useSupabaseHistory';
import { useAuth } from '@/hooks/useAuth';
import { HistoryItem as SupabaseHistoryItem } from '@/lib/supabase/types';

// Unified history item type
type UnifiedHistoryItem = {
    id: string;
    type: string;
    title: string;
    description: string | null;
    status: string;
    txHash: string | null;
    timestamp: string;
    data?: any;
};

// Convert Supabase history item to unified format
function toUnifiedItem(item: SupabaseHistoryItem): UnifiedHistoryItem {
    return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        status: item.status,
        txHash: item.tx_hash,
        timestamp: item.created_at,
        data: item.data,
    };
}

// Convert local history item to unified format
function localToUnifiedItem(item: LocalHistoryItem): UnifiedHistoryItem {
    return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        status: item.status,
        txHash: item.txHash || null,
        timestamp: new Date(item.timestamp).toISOString(),
        data: item.data,
    };
}

function HistoryItemDetail({ item }: { item: UnifiedHistoryItem }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getIcon = () => {
        switch (item.type) {
            case 'generate':
            case 'deploy':
                return <Code size={18} />;
            case 'audit':
                return <Shield size={18} />;
            case 'token':
                return <Coins size={18} />;
            case 'swap':
                return <ArrowRightLeft size={18} />;
            default:
                return <CheckCircle2 size={18} />;
        }
    };

    const getTypeColor = () => {
        switch (item.type) {
            case 'generate':
            case 'deploy':
                return 'bg-purple-500/10 text-purple-500';
            case 'audit':
                return 'bg-blue-500/10 text-blue-500';
            case 'token':
                return 'bg-yellow-500/10 text-yellow-500';
            case 'swap':
                return 'bg-green-500/10 text-green-500';
            default:
                return 'bg-gray-500/10 text-gray-500';
        }
    };

    const hasDetails = item.data && (
        item.data.contractCode ||
        item.data.auditScore !== undefined ||
        item.data.fromToken ||
        item.data.tokenName
    );

    return (
        <div className="bg-[#1A1B1E] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
            <div
                className={`p-4 flex items-center justify-between ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'success' ? getTypeColor() : 'bg-gray-700 text-gray-400'}`}>
                        {item.status === 'success' ? getIcon() : <Clock size={18} />}
                    </div>
                    <div>
                        <h3 className="text-white font-medium">{item.title}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-sm text-gray-400 mb-1">
                            {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                        {item.txHash && (
                            <a
                                href={`https://testnet.bscscan.com/tx/${item.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 flex items-center justify-end gap-1 hover:text-blue-300"
                                onClick={(e) => e.stopPropagation()}
                            >
                                View on Explorer <ArrowUpRight size={10} />
                            </a>
                        )}
                    </div>
                    {hasDetails && (
                        <div className="text-gray-500">
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && item.data && (
                <div className="border-t border-white/5 p-4 bg-black/20">
                    {/* Contract Code */}
                    {item.data.contractCode && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Generated Contract</span>
                                <button
                                    onClick={() => copyToClipboard(item.data!.contractCode!)}
                                    className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"
                                >
                                    {copied ? <Check size={12} /> : <Copy size={12} />}
                                    {copied ? 'Copied!' : 'Copy Code'}
                                </button>
                            </div>
                            <pre className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto max-h-48 overflow-y-auto">
                                {item.data.contractCode.slice(0, 500)}
                                {item.data.contractCode.length > 500 && '...'}
                            </pre>
                            {item.data.contractName && (
                                <div className="mt-2 text-xs text-gray-500">
                                    Contract: {item.data.contractName} | Compiler: {item.data.compilerVersion}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Audit Results */}
                    {item.data.auditScore !== undefined && (
                        <div className="mb-4">
                            <div className="flex items-center gap-4 mb-3">
                                <div className={`text-2xl font-bold ${item.data.auditScore >= 80 ? 'text-green-400' :
                                    item.data.auditScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                    {item.data.auditScore}/100
                                </div>
                                <span className="text-sm text-gray-400">Security Score</span>
                            </div>
                            {item.data.vulnerabilities && item.data.vulnerabilities.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-sm text-gray-400">Vulnerabilities Found:</span>
                                    {item.data.vulnerabilities.slice(0, 5).map((vuln: any, i: number) => (
                                        <div key={i} className={`text-xs p-2 rounded ${vuln.severity === 'critical' ? 'bg-red-500/10 text-red-400' :
                                            vuln.severity === 'high' ? 'bg-orange-500/10 text-orange-400' :
                                                vuln.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            <span className="font-medium uppercase">{vuln.severity}:</span> {vuln.description}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Swap Details */}
                    {item.data.fromToken && (
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-400">{item.data.fromAmount} {item.data.fromToken}</span>
                            <ArrowRightLeft size={14} className="text-gray-500" />
                            <span className="text-green-400">{item.data.toAmount} {item.data.toToken}</span>
                        </div>
                    )}

                    {/* Token Details */}
                    {item.data.tokenName && (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Token Name:</span>
                                <span className="text-white">{item.data.tokenName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Symbol:</span>
                                <span className="text-white">{item.data.tokenSymbol}</span>
                            </div>
                            {item.data.tokenAddress && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Address:</span>
                                    <a
                                        href={`https://testnet.bscscan.com/address/${item.data.tokenAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300"
                                    >
                                        {item.data.tokenAddress.slice(0, 10)}...
                                    </a>
                                </div>
                            )}
                            {item.data.totalSupply && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Supply:</span>
                                    <span className="text-white">{item.data.totalSupply}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contract Address */}
                    {item.data.contractAddress && !item.data.tokenAddress && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Contract Address:</span>
                            <a
                                href={`https://testnet.bscscan.com/address/${item.data.contractAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                {item.data.contractAddress.slice(0, 10)}...{item.data.contractAddress.slice(-8)}
                                <ArrowUpRight size={12} />
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function HistoryView() {
    const { isAuthenticated } = useAuth();
    const localHistory = useHistory();
    const supabaseHistory = useSupabaseHistory();

    // Use Supabase history if authenticated, otherwise use local storage
    const isCloudSynced = isAuthenticated && supabaseHistory.isAuthenticated;
    const loading = isCloudSynced ? supabaseHistory.loading : false;

    // Convert to unified format
    const unifiedHistory: UnifiedHistoryItem[] = isCloudSynced
        ? supabaseHistory.history.map(toUnifiedItem)
        : localHistory.history.map(localToUnifiedItem);

    const handleClearHistory = async () => {
        if (isCloudSynced) {
            await supabaseHistory.clearHistory();
        } else {
            localHistory.clearHistory();
        }
    };

    return (
        <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">Activity History</h2>
                    {isCloudSynced ? (
                        <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                            <Cloud size={12} />
                            Synced
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-500/10 px-2 py-1 rounded-full">
                            <CloudOff size={12} />
                            Local only
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {isCloudSynced && (
                        <button
                            onClick={() => supabaseHistory.refreshHistory()}
                            className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-sm text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-2"
                        >
                            <Loader2 size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    )}
                    <button
                        onClick={handleClearHistory}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-sm text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={14} /> Clear
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <Loader2 size={32} className="animate-spin text-blue-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading history...</p>
                </div>
            ) : unifiedHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>No activity yet. Start by swapping tokens, creating a token, or auditing a contract.</p>
                    {!isAuthenticated && (
                        <p className="mt-2 text-sm text-blue-400">
                            Sign in to sync your history across devices.
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {unifiedHistory.map((item) => (
                        <HistoryItemDetail key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
