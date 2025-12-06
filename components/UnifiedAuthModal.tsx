'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Loader2, Eye, EyeOff, User, Wallet, ArrowLeft } from 'lucide-react';
import { useConnect, useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';

interface UnifiedAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthView = 'main' | 'email' | 'wallet-connecting' | 'wallet-signing';
type EmailMode = 'login' | 'register';

export function UnifiedAuthModal({ isOpen, onClose }: UnifiedAuthModalProps) {
    const [view, setView] = useState<AuthView>('main');
    const [emailMode, setEmailMode] = useState<EmailMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const { signIn, signUp, signInWithGoogle, signInWithWallet, loading, error } = useAuth();
    const { connectors, connectAsync, isPending: isConnecting } = useConnect();
    const { address: connectedAddress, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { disconnectAsync } = useDisconnect();

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setView('main');
            setEmailMode('login');
            setEmail('');
            setPassword('');
            setUsername('');
            setLocalError(null);
        }
    }, [isOpen]);

    const handleWalletSign = async (walletAddress: string) => {
        setView('wallet-signing');
        setLocalError(null);

        try {
            const { error } = await signInWithWallet(walletAddress, async (message: string) => {
                // Let wagmi determine the account from connected wallet
                const signature = await signMessageAsync({ message });
                return signature;
            });

            if (!error) {
                onClose();
            } else {
                setLocalError(error.message);
                setView('main');
                await disconnectAsync();
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
            setLocalError(errorMessage);
            setView('main');
            await disconnectAsync();
        }
    };

    const handleWalletConnect = async (connectorId: string) => {
        setLocalError(null);

        // If wallet is already connected in wagmi, skip the connect step and go straight to signing
        if (isConnected && connectedAddress) {
            await handleWalletSign(connectedAddress);
            return;
        }

        setView('wallet-connecting');

        const connector = connectors.find((currentConnector) => currentConnector.id === connectorId);
        if (!connector) {
            setLocalError('Connector not found');
            setView('main');
            return;
        }

        try {
            // Start connection flow. If MetaMask is already authorized for this site,
            // this should resolve quickly without a popup.
            // Add a timeout to prevent infinite hanging
            const result = await Promise.race([
                connectAsync({ connector }),
                new Promise<any>((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timed out. Please try again or check your wallet.')), 15000)
                )
            ]);

            if (result.accounts && result.accounts.length > 0) {
                // Connection successful, proceed to signing
                await handleWalletSign(result.accounts[0]);
            } else if (connectedAddress) {
                // Fallback: wagmi is connected but did not return accounts in this call
                await handleWalletSign(connectedAddress);
            } else {
                throw new Error('No accounts returned');
            }
        } catch (err: unknown) {
            console.error('Wallet connection error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
            // Do not treat explicit user cancellation as an error in the UI
            const lowerCaseMessage = errorMessage.toLowerCase();
            if (!lowerCaseMessage.includes('user rejected') &&
                !lowerCaseMessage.includes('user denied') &&
                !lowerCaseMessage.includes('already connected')) {
                setLocalError(errorMessage);
            }
            setView('main');
        }
    };

    const handleGoogleAuth = async () => {
        setLocalError(null);
        await signInWithGoogle();
        // Google OAuth redirects, so we don't need to close modal
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }

        if (emailMode === 'register') {
            const { error } = await signUp(email, password, username);
            if (!error) {
                onClose();
            }
        } else {
            const { error } = await signIn(email, password);
            if (!error) {
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    const displayError = localError || error?.message;

    // Get available wallet connectors (filter unique by id)
    const walletConnectors = connectors
        .filter(c => ['injected', 'metaMask', 'walletConnect', 'coinbaseWallet'].includes(c.id))
        .filter((c, index, self) => self.findIndex(x => x.id === c.id) === index);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#0A0A0F] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Back button for sub-views */}
                {view !== 'main' && view !== 'wallet-connecting' && view !== 'wallet-signing' && (
                    <button
                        onClick={() => setView('main')}
                        className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}

                {/* Error message */}
                {displayError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {displayError}
                    </div>
                )}

                {/* Main View - Choose auth method */}
                {view === 'main' && (
                    <>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Welcome to ChainGPT
                            </h2>
                            <p className="text-gray-400 text-sm">
                                Sign in to save your history and access it anywhere
                            </p>
                        </div>

                        <div className="space-y-3">
                            {/* Wallet options */}
                            {walletConnectors.map((connector) => (
                                <button
                                    key={connector.id}
                                    onClick={() => handleWalletConnect(connector.id)}
                                    disabled={isConnecting}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                                        <Wallet size={18} className="text-white" />
                                    </div>
                                    <span className="text-white font-medium">
                                        {connector.name === 'Injected' ? 'Browser Wallet' : connector.name}
                                    </span>
                                </button>
                            ))}

                            {/* Divider */}
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-[#0A0A0F] text-gray-500">or</span>
                                </div>
                            </div>

                            {/* Google button */}
                            <button
                                onClick={handleGoogleAuth}
                                disabled={loading}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span className="text-gray-900 font-medium">Continue with Google</span>
                            </button>

                            {/* Email button */}
                            <button
                                onClick={() => setView('email')}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                    <Mail size={18} className="text-white" />
                                </div>
                                <span className="text-white font-medium">Continue with Email</span>
                            </button>
                        </div>

                        <p className="mt-6 text-center text-xs text-gray-500">
                            By continuing, you agree to our Terms of Service
                        </p>
                    </>
                )}

                {/* Wallet Connecting View */}
                {view === 'wallet-connecting' && (
                    <div className="text-center py-8">
                        <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Connecting Wallet
                        </h3>
                        <p className="text-gray-400">
                            Please approve the connection in your wallet...
                        </p>
                        <button
                            onClick={async () => {
                                await disconnectAsync();
                                setView('main');
                            }}
                            className="mt-4 text-sm text-gray-400 hover:text-white"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Wallet Signing View */}
                {view === 'wallet-signing' && (
                    <div className="text-center py-8">
                        <Loader2 size={48} className="animate-spin text-purple-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Sign Message
                        </h3>
                        <p className="text-gray-400">
                            Please sign the message in your wallet to verify ownership...
                        </p>
                        <button
                            onClick={async () => {
                                await disconnectAsync();
                                setView('main');
                            }}
                            className="mt-4 text-sm text-gray-400 hover:text-white"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Email View */}
                {view === 'email' && (
                    <>
                        <div className="text-center mb-6 pt-4">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {emailMode === 'login' ? 'Sign In' : 'Create Account'}
                            </h2>
                        </div>

                        {/* Mode tabs */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setEmailMode('login')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${emailMode === 'login'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setEmailMode('register')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${emailMode === 'register'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                Register
                            </button>
                        </div>

                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            {emailMode === 'register' && (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Username (optional)</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Your username"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Email</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        {emailMode === 'login' ? 'Signing in...' : 'Creating account...'}
                                    </>
                                ) : (
                                    emailMode === 'login' ? 'Sign In' : 'Create Account'
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
