'use client';

import { useState } from 'react';
import { Chat } from '@/components/Chat';
import { AccountMenu } from '@/components/AccountMenu';
import { NetworkToggle } from '@/components/NetworkToggle';
import { Sidebar } from '@/components/Sidebar';
import { HistoryView } from '@/components/HistoryView';
import { UnifiedAuthModal } from '@/components/UnifiedAuthModal';
import { MobileNav } from '@/components/MobileNav';
import { SettingsView } from '@/components/SettingsView';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settings'>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, loading } = useAuth();

  return (
    <main className="min-h-screen bg-[#0D0E12] text-white flex relative overflow-hidden">

      {/* Sidebar (Desktop) */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 relative min-h-screen">

        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
        </div>

        {/* Header / Navbar */}
        <div className="w-full p-6 flex justify-end items-center z-10 relative">
          {/* Mobile Logo (visible only on small screens) */}
          <div className="md:hidden flex items-center gap-2 mr-auto">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
            <span className="font-bold text-xl tracking-tight">ChainGPT</span>
          </div>

          <div className="flex items-center gap-4">
            <NetworkToggle />
            <AccountMenu
              onOpenAuth={() => setShowAuthModal(true)}
              onOpenHistory={() => setActiveTab('history')}
              onOpenSettings={() => setActiveTab('settings')}
            />
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
          {activeTab === 'home' && (
            <div className="w-full max-w-3xl flex flex-col items-center gap-8">
              <div className="text-center space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  Your AI Web3 Companion
                </h1>
                <p className="text-gray-400 text-lg">
                  Audit contracts, swap tokens, and generate code with simple commands.
                </p>
                {!isAuthenticated && !loading && (
                  <p className="text-sm text-blue-400">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="hover:underline"
                    >
                      Sign in
                    </button>
                    {' '}to save your history and access it from anywhere.
                  </p>
                )}
              </div>

              <Chat />
            </div>
          )}

          {activeTab === 'history' && (
            <HistoryView />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <UnifiedAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenProfile={() => setShowAuthModal(true)}
        isAuthenticated={isAuthenticated}
      />

      {/* Spacer for mobile nav */}
      <div className="h-16 md:hidden" />
    </main>
  );
}
