'use client';

import { Home, History, User } from 'lucide-react';

interface MobileNavProps {
    activeTab: 'home' | 'history' | 'settings';
    onTabChange: (tab: 'home' | 'history' | 'settings') => void;
    onOpenProfile: () => void;
    isAuthenticated?: boolean;
}

export function MobileNav({ activeTab, onTabChange, onOpenProfile, isAuthenticated }: MobileNavProps) {
    const handleProfileClick = () => {
        if (isAuthenticated) {
            // Authenticated users go to settings tab
            onTabChange('settings');
        } else {
            // Unauthenticated users get the auth modal
            onOpenProfile();
        }
    };

    return (
        <nav className="fixed bottom-0 inset-x-0 md:hidden bg-[#05050A] border-t border-white/10 z-50 safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-4">
                <button
                    onClick={() => onTabChange('home')}
                    className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === 'home'
                            ? 'text-blue-400'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Home size={22} />
                    <span className="text-xs font-medium">Home</span>
                </button>

                <button
                    onClick={() => onTabChange('history')}
                    className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === 'history'
                            ? 'text-blue-400'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <History size={22} />
                    <span className="text-xs font-medium">History</span>
                </button>

                <button
                    onClick={handleProfileClick}
                    className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === 'settings'
                            ? 'text-blue-400'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <User size={22} />
                    <span className="text-xs font-medium">Profile</span>
                </button>
            </div>
        </nav>
    );
}
