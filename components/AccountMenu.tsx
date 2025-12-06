'use client';

import { useState } from 'react';
import { useConnect, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { User, LogOut, History, Settings, ChevronDown, Copy, Check, Wallet, Plus } from 'lucide-react';
import { useAccountStatus } from '@/hooks/useAccountStatus';

interface AccountMenuProps {
    onOpenAuth: () => void;
    onOpenHistory: () => void;
    onOpenSettings?: () => void;
}

export function AccountMenu({ onOpenAuth, onOpenHistory, onOpenSettings }: AccountMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const { connectors, connect } = useConnect();
    const { disconnect } = useDisconnect();

    const {
        web3Address,
        isWeb3Connected,
        supabaseProfile,
        isSupabaseAuthenticated,
        linkedWalletAddress,
        displayAddress,
        displayName,
        signOut,
        loading
    } = useAccountStatus();

    const copyAddress = () => {
        if (displayAddress) {
            navigator.clipboard.writeText(displayAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSignOut = async () => {
        // Disconnect wallet if connected
        if (isWeb3Connected) {
            disconnect();
        }
        await signOut();
        setIsOpen(false);
    };


    const truncateAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    if (!isSupabaseAuthenticated) {
        return (
            <div className="flex items-center gap-2">
                <ConnectButton.Custom>
                    {({ account, chain, openAccountModal, openConnectModal, authenticationStatus, mounted }) => {
                        const ready = mounted && authenticationStatus !== 'loading';
                        const connected =
                            ready &&
                            account &&
                            chain &&
                            (!authenticationStatus ||
                                authenticationStatus === 'authenticated');

                        if (!ready) return null;

                        if (connected) {
                            return (
                                <button
                                    onClick={openAccountModal}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg transition-all"
                                >
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px]">
                                        {chain.iconUrl && (
                                            <img
                                                alt={chain.name ?? 'Chain icon'}
                                                src={chain.iconUrl}
                                                className="w-full h-full rounded-full"
                                            />
                                        )}
                                    </div>
                                    <span className="hidden sm:inline">{account.displayName}</span>
                                    <ChevronDown size={14} className="text-gray-400" />
                                </button>
                            );
                        }

                        return (
                            <button
                                onClick={openConnectModal}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg transition-all"
                            >
                                <Wallet size={18} />
                                <span className="hidden sm:inline">Connect Wallet</span>
                            </button>
                        );
                    }}
                </ConnectButton.Custom>
                <button
                    onClick={onOpenAuth}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all"
                >
                    <User size={18} />
                    <span className="hidden sm:inline">Sign In</span>
                </button>
            </div>
        );
    }

    // Authenticated - show profile dropdown
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {supabaseProfile?.avatar_url ? (
                        <img
                            src={supabaseProfile.avatar_url}
                            alt={displayName}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <User size={16} className="text-white" />
                    )}
                </div>
                <span className="text-white font-medium max-w-[100px] truncate hidden sm:block">
                    {displayName}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-2 w-72 bg-[#1A1B1E] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* User info */}
                        <div className="p-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    {supabaseProfile?.avatar_url ? (
                                        <img
                                            src={supabaseProfile.avatar_url}
                                            alt={displayName}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <User size={24} className="text-white" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium truncate">
                                        {displayName}
                                    </div>
                                    <div className="text-gray-400 text-sm truncate">
                                        {supabaseProfile?.email || 'No email'}
                                    </div>
                                </div>
                            </div>

                            {/* Wallet section */}
                            {isWeb3Connected && displayAddress ? (
                                <button
                                    onClick={copyAddress}
                                    className="mt-3 w-full flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Wallet size={14} className="text-gray-400" />
                                        <span className="text-gray-300 text-sm font-mono">
                                            {truncateAddress(displayAddress)}
                                        </span>
                                        {linkedWalletAddress && linkedWalletAddress === web3Address && (
                                            <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                                                Linked
                                            </span>
                                        )}
                                    </div>
                                    {copied ? (
                                        <Check size={14} className="text-green-400" />
                                    ) : (
                                        <Copy size={14} className="text-gray-400" />
                                    )}
                                </button>
                            ) : (
                                <ConnectButton.Custom>
                                    {({ openConnectModal, mounted }) => {
                                        if (!mounted) return null;
                                        return (
                                            <button
                                                onClick={openConnectModal}
                                                className="mt-3 w-full flex items-center justify-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-blue-400"
                                            >
                                                <Plus size={14} />
                                                <span className="text-sm">Connect Wallet</span>
                                            </button>
                                        );
                                    }}
                                </ConnectButton.Custom>
                            )}
                        </div>

                        {/* Menu items */}
                        <div className="p-2">
                            <button
                                onClick={() => {
                                    onOpenHistory();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <History size={18} />
                                <span>Activity History</span>
                            </button>

                            <button
                                onClick={() => {
                                    onOpenSettings?.();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <Settings size={18} />
                                <span>Settings</span>
                            </button>

                            {/* Disconnect wallet option if connected */}
                            {isWeb3Connected && (
                                <button
                                    onClick={() => {
                                        disconnect();
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Wallet size={18} />
                                    <span>Disconnect Wallet</span>
                                </button>
                            )}

                            <div className="my-2 border-t border-white/10" />

                            <button
                                onClick={handleSignOut}
                                disabled={loading}
                                className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <LogOut size={18} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
