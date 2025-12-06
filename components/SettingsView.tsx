'use client';

import React, { useState } from 'react';
import { 
    Shield, 
    Wallet, 
    Bell, 
    Globe, 
    Sliders, 
    Info,
    ExternalLink,
    Check,
    ChevronRight
} from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';

interface SettingsSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

function SettingsSection({ title, icon, children }: SettingsSectionProps) {
    return (
        <div className="bg-[#1A1B1E] border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/5">
                <div className="text-blue-400">{icon}</div>
                <h3 className="text-white font-semibold">{title}</h3>
            </div>
            <div className="p-4 space-y-4">
                {children}
            </div>
        </div>
    );
}

interface ToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-white text-sm font-medium">{label}</p>
                {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                    checked ? 'bg-blue-600' : 'bg-gray-700'
                }`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    checked ? 'left-6' : 'left-1'
                }`} />
            </button>
        </div>
    );
}

export function SettingsView() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { profile, isAuthenticated } = useAuth();

    // Settings state (stored in localStorage for persistence)
    const [settings, setSettings] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('chaingpt_settings');
            if (saved) return JSON.parse(saved);
        }
        return {
            autoApprove: false,
            showRiskWarnings: true,
            defaultSlippage: 3,
            preferQ402: false,
            notifications: true,
        };
    });

    const updateSetting = (key: string, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        if (typeof window !== 'undefined') {
            localStorage.setItem('chaingpt_settings', JSON.stringify(newSettings));
        }
    };

    const isTestnet = chainId === 97;

    return (
        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

            <div className="space-y-4">
                {/* Account Section */}
                <SettingsSection title="Account" icon={<Wallet size={20} />}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div>
                                <p className="text-gray-400 text-xs">Wallet Address</p>
                                <p className="text-white font-mono text-sm">
                                    {isConnected ? `${address?.slice(0, 10)}...${address?.slice(-8)}` : 'Not connected'}
                                </p>
                            </div>
                            {isConnected && (
                                <a
                                    href={`https://${isTestnet ? 'testnet.' : ''}bscscan.com/address/${address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div>
                                <p className="text-gray-400 text-xs">Profile</p>
                                <p className="text-white text-sm">
                                    {isAuthenticated ? (profile?.username || profile?.email || 'Logged in') : 'Guest'}
                                </p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                                isAuthenticated ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                                {isAuthenticated ? 'Synced' : 'Local'}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div>
                                <p className="text-gray-400 text-xs">Network</p>
                                <p className="text-white text-sm">{isTestnet ? 'BSC Testnet' : 'BSC Mainnet'}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                                isTestnet ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                                {isTestnet ? 'Testnet' : 'Mainnet'}
                            </div>
                        </div>
                    </div>
                </SettingsSection>

                {/* Security Section */}
                <SettingsSection title="Security & Policy" icon={<Shield size={20} />}>
                    <Toggle
                        label="Show Risk Warnings"
                        description="Display risk assessment before transactions"
                        checked={settings.showRiskWarnings}
                        onChange={(v) => updateSetting('showRiskWarnings', v)}
                    />
                    
                    <div className="border-t border-white/5 pt-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
                                <div className="text-xs text-blue-200">
                                    <p className="font-semibold mb-1">Policy Limits (Active)</p>
                                    <ul className="space-y-1 text-blue-300/80">
                                        <li>• Max per transaction: 5 BNB</li>
                                        <li>• Daily spend limit: 10 BNB</li>
                                        <li>• Slippage protection: {settings.defaultSlippage}%</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </SettingsSection>

                {/* Transaction Settings */}
                <SettingsSection title="Transactions" icon={<Sliders size={20} />}>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-white text-sm font-medium">Default Slippage</p>
                                <span className="text-blue-400 font-mono text-sm">{settings.defaultSlippage}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="10"
                                step="0.5"
                                value={settings.defaultSlippage}
                                onChange={(e) => updateSetting('defaultSlippage', parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0.5%</span>
                                <span>10%</span>
                            </div>
                        </div>

                        <Toggle
                            label="Prefer Q402 Gas Sponsorship"
                            description="Use Q402 for gasless transactions by default"
                            checked={settings.preferQ402}
                            onChange={(v) => updateSetting('preferQ402', v)}
                        />
                    </div>
                </SettingsSection>

                {/* About Section */}
                <SettingsSection title="About" icon={<Info size={20} />}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Version</span>
                            <span className="text-white text-sm">1.0.0</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Powered by</span>
                            <span className="text-white text-sm">ChainGPT + Quack Q402</span>
                        </div>
                        
                        <div className="border-t border-white/5 pt-3 space-y-2">
                            <a
                                href="https://docs.chaingpt.org"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                                <span className="text-gray-300 text-sm">ChainGPT Documentation</span>
                                <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                            </a>
                            <a
                                href="https://github.com/quackai-labs/Q402"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                                <span className="text-gray-300 text-sm">Quack Q402 Repository</span>
                                <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                            </a>
                            <a
                                href="https://testnet.bscscan.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                                <span className="text-gray-300 text-sm">BSC Testnet Explorer</span>
                                <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                            </a>
                        </div>
                    </div>
                </SettingsSection>
            </div>
        </div>
    );
}
