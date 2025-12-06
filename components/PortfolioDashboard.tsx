import React from 'react';
import { AlertTriangle, Shield, RefreshCw } from 'lucide-react';

interface PortfolioDashboardProps {
    riskScore: number;
    assets: Array<{
        token: string;
        address: string;
        balance: string;
        valueUsd: number;
    }>;
    riskyAssets: Array<{
        token: string;
        reason: string;
    }>;
    onScan?: () => void;
}

export function PortfolioDashboard({ riskScore, assets, riskyAssets, onScan }: PortfolioDashboardProps) {
    // Determine gradient based on score
    const scoreColor = riskScore > 70 ? '#DC143C' : riskScore > 40 ? '#F59E0B' : '#00FF7F';

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-[#0A0A1A] rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex flex-wrap justify-between gap-3 mb-6">
                <h1 className="text-white text-2xl md:text-3xl font-black leading-tight tracking-tight flex items-center gap-2">
                    <Shield className="text-blue-500" /> Portfolio Guardian
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Risk Score */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        <p className="text-white/80 text-base font-medium mb-4 relative z-10">Wallet Risk Score</p>

                        <div className="relative flex items-center justify-center my-4 z-10">
                            <svg className="transform -rotate-90 w-40 h-40">
                                <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                                <circle
                                    cx="80" cy="80" r="70" fill="none"
                                    stroke={scoreColor}
                                    strokeWidth="12"
                                    strokeDasharray="440"
                                    strokeDashoffset={440 - (440 * riskScore) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-white">{riskScore}</span>
                                <span className="text-white/60 text-xs">/ 100</span>
                            </div>
                        </div>

                        <p className="text-white/90 text-center text-sm mt-4 relative z-10">
                            {riskScore < 50 ? '✅ Optimal health. No critical threats.' : '⚠️ Attention needed. High risk assets detected.'}
                        </p>

                        {onScan && (
                            <button onClick={onScan} className="w-full mt-6 flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-blue-600/20 text-blue-400 text-sm font-bold hover:bg-blue-600/30 transition-colors relative z-10">
                                <RefreshCw size={16} />
                                <span className="truncate">Run New Scan</span>
                            </button>
                        )}
                    </div>

                    {/* Alerts (Only show if risk > 0) */}
                    {riskyAssets.length > 0 && (
                        <div className="p-6 rounded-xl border border-red-500/50 bg-red-500/10 backdrop-blur-xl">
                            <h3 className="text-white text-lg font-bold pb-2 flex items-center gap-2">
                                <AlertTriangle className="text-red-500" size={20} />
                                Critical Alerts
                            </h3>
                            <div className="flex flex-col gap-4 mt-2">
                                {riskyAssets.map((asset, i) => (
                                    <div key={i} className="p-4 rounded-lg bg-black/40 border border-red-500/30">
                                        <p className="text-base font-bold text-red-500">{asset.token} - High Risk</p>
                                        <p className="text-sm text-white/80 mt-1">{asset.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Asset List */}
                <div className="lg:col-span-2">
                    <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl h-full">
                        <h3 className="text-white text-lg font-bold pb-4">Monitored Assets</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="p-3 text-sm font-medium text-white/60">Asset</th>
                                        <th className="p-3 text-sm font-medium text-white/60 text-right">Balance</th>
                                        <th className="p-3 text-sm font-medium text-white/60 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assets.map((asset, i) => {
                                        const isRisky = riskyAssets.some(r => r.token === asset.token);
                                        return (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-3 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                                                        {asset.token[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{asset.token}</p>
                                                        <p className="text-sm text-white/60">{asset.address.slice(0, 6)}...{asset.address.slice(-4)}</p>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <p className="font-medium text-white">{asset.balance}</p>
                                                    <p className="text-xs text-white/40">${asset.valueUsd.toFixed(2)}</p>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${isRisky
                                                        ? 'bg-red-500/20 text-red-500'
                                                        : 'bg-green-500/20 text-green-500'
                                                        }`}>
                                                        {isRisky ? 'Suspicious' : 'Safe'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
