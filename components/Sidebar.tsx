'use client';

import React from 'react';
import { MessageSquare, History, Settings} from 'lucide-react';
import { useAccountStatus } from '@/hooks/useAccountStatus';

interface SidebarProps {
    activeTab: 'home' | 'history' | 'settings';
    onTabChange: (tab: 'home' | 'history' | 'settings') => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const { displayName, displayAddress, isSupabaseAuthenticated, isWeb3Connected } = useAccountStatus();

    const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div className="hidden md:flex flex-col w-64 h-screen bg-[#05050A] border-r border-white/5 p-4 fixed left-0 top-0 z-50">
            {/* Logo Area */}
            <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">
                    C
                </div>
                <div>
                    <h1 className="font-bold text-white text-lg leading-none">ChainGPT</h1>
                    <p className="text-xs text-gray-500">Web3 Copilot</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                <button
                    onClick={() => onTabChange('home')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'home'
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <MessageSquare size={20} />
                    <span>Home</span>
                </button>

                <button
                    onClick={() => onTabChange('history')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'history'
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <History size={20} />
                    <span>History</span>
                </button>

                <button
                    onClick={() => onTabChange('settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'settings'
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Settings size={20} />
                    <span>Settings</span>
                </button>
            </nav>

            {/* Footer / User Profile */}
            <div className="mt-auto pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                            {isSupabaseAuthenticated ? displayName.charAt(0).toUpperCase() : 'G'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">
                            {isSupabaseAuthenticated ? displayName : 'Guest'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {displayAddress ? truncateAddress(displayAddress) : (isWeb3Connected ? 'Wallet connected' : 'Not connected')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
