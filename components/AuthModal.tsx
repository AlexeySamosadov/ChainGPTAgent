'use client';

import { useState } from 'react';
import { X, Mail, Loader2, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthMode = 'login' | 'register';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const { signIn, signUp, signInWithGoogle, loading, error } = useAuth();

    if (!isOpen) return null;

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }

        if (mode === 'register') {
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

    const handleGoogleAuth = async () => {
        setLocalError(null);
        await signInWithGoogle();
        // Note: Google OAuth redirects, so we don't need to close modal
    };

    const displayError = localError || error?.message;

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

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        Access your ChainGPT Agent account
                    </p>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${mode === 'login'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${mode === 'register'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Register
                    </button>
                </div>

                {/* Error message */}
                {displayError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {displayError}
                    </div>
                )}

                {/* Email/Password form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {mode === 'register' && (
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
                                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                            </>
                        ) : (
                            <>
                                <Mail size={18} />
                                {mode === 'login' ? 'Sign In' : 'Create Account'}
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-[#0A0A0F] text-gray-500">or continue with</span>
                    </div>
                </div>

                {/* Social login buttons */}
                <div className="space-y-3">
                    {/* Google button */}
                    <button
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                        Continue with Google
                    </button>
                </div>
            </div>
        </div>
    );
}