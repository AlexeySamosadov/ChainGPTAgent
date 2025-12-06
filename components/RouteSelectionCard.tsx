import React from 'react';
import { Zap, Shield, TrendingUp, ArrowRight } from 'lucide-react';

interface RouteOption {
    id: string;
    type: 'best' | 'fast' | 'safe';
    provider: string;
    outputAmount: string;
    gasFee: string;
    time: string;
    tags: string[];
}

interface RouteSelectionCardProps {
    routes: RouteOption[];
    onSelect: (routeId: string) => void;
}

export function RouteSelectionCard({ routes, onSelect }: RouteSelectionCardProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case 'best': return <TrendingUp size={18} className="text-green-400" />;
            case 'fast': return <Zap size={18} className="text-yellow-400" />;
            case 'safe': return <Shield size={18} className="text-blue-400" />;
            default: return <TrendingUp size={18} />;
        }
    };

    const getGradient = (type: string) => {
        switch (type) {
            case 'best': return 'from-green-500/10 to-green-500/5 border-green-500/20 hover:border-green-500/40';
            case 'fast': return 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40';
            case 'safe': return 'from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40';
            default: return 'bg-white/5 border-white/10';
        }
    };

    return (
        <div className="w-full max-w-md mx-auto mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium text-gray-400">Select a Route</span>
                <span className="text-xs text-gray-500">Powered by ChainGPT</span>
            </div>

            {routes.map((route) => (
                <button
                    key={route.id}
                    onClick={() => onSelect(route.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r transition-all group ${getGradient(route.type)}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black/40 border border-white/5`}>
                            {getIcon(route.type)}
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold">{route.provider}</span>
                                {route.tags.map(tag => (
                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 border border-white/5">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                                ≈ {route.time} • Gas: {route.gasFee}
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-white font-mono font-bold text-lg">
                            {route.outputAmount}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Select <ArrowRight size={10} />
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
