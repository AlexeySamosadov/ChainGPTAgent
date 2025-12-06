'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Loader2, CheckCircle2, Circle, Mic, Square } from 'lucide-react';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useTxFlow } from '@/hooks/useTxFlow';
import { useHistory } from '@/hooks/useHistory';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { TokenSelectionCard } from './TokenSelectionCard';
import { RouteSelectionCard } from './RouteSelectionCard';
import { PortfolioDashboard } from './PortfolioDashboard';
import { TransactionStatus } from './TransactionStatus';
import { TxPreviewModal } from './TxPreviewModal';

export function Chat() {
    const { messages, sendMessage, isLoading, currentPlan, completedSteps } = useAgentChat();
    const { signAndSend, isSigning, txHash } = useTxFlow();
    const { addHistoryItem } = useHistory();
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [input, setInput] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [currentTxDraft, setCurrentTxDraft] = useState<any>(null);
    const [currentRisk, setCurrentRisk] = useState<'low' | 'medium' | 'high'>('low');

    // Track which steps we've already saved to history
    const savedStepsRef = useRef<Set<string>>(new Set());

    // Derive current step for route selection
    const currentRouteStep = currentPlan?.steps.find((s: any) => s.status === 'pending_selection');
    // Derive current step for token selection
    const currentTokenStep = currentPlan?.steps.find((s: any) => s.status === 'pending_token_selection');

    // Save completed steps to history
    useEffect(() => {
        completedSteps.forEach((step, index) => {
            const stepKey = `${step.type}-${index}-${JSON.stringify(step.params || {})}`;

            if (savedStepsRef.current.has(stepKey)) return;
            savedStepsRef.current.add(stepKey);

            switch (step.type) {
                case 'generate_contract':
                    if (step.result?.sourceCode) {
                        addHistoryItem({
                            type: 'generate',
                            title: 'Contract Generated',
                            description: step.params?.description || 'Smart contract generated',
                            status: 'success',
                            data: {
                                contractCode: step.result.sourceCode,
                                contractName: step.result.contractName,
                                compilerVersion: step.result.compilerVersion
                            }
                        });
                    }
                    break;

                case 'audit_contract':
                    if (step.result) {
                        addHistoryItem({
                            type: 'audit',
                            title: 'Contract Audited',
                            description: `Security Score: ${step.result.score}/100`,
                            status: 'success',
                            data: {
                                auditScore: step.result.score,
                                vulnerabilities: step.result.vulnerabilities,
                                contractAddress: step.params?.address
                            }
                        });
                    }
                    break;

                case 'portfolio_check':
                    if (step.result) {
                        addHistoryItem({
                            type: 'swap', // Using swap type for portfolio
                            title: 'Portfolio Analyzed',
                            description: `Risk Score: ${step.result.riskScore}/100`,
                            status: 'success',
                            data: {
                                auditScore: step.result.riskScore,
                                vulnerabilities: step.result.riskyAssets?.map((a: any) => ({
                                    severity: a.risk > 70 ? 'high' : a.risk > 40 ? 'medium' : 'low',
                                    description: `${a.symbol}: ${a.reason}`
                                }))
                            }
                        });
                    }
                    break;
            }
        });
    }, [completedSteps, addHistoryItem]);

    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'agent' && lastMsg.txDraft) {
            setCurrentTxDraft(lastMsg.txDraft);
            setCurrentRisk(lastMsg.riskLevel || 'low');
            setShowModal(true);
        }
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    const handleConfirmTx = async (useQuack: boolean) => {
        try {
            const hash = await signAndSend(currentTxDraft, useQuack);
            if (hash) {
                addHistoryItem({
                    type: 'swap', // Simplified, could be 'deploy' based on description
                    title: currentTxDraft.description || 'Transaction',
                    description: 'Executed via ChainGPT Agent',
                    status: 'success',
                    txHash: hash
                });
            }
            setShowModal(false);
        } catch (error) {
            // Error handled in hook
        }
    };

    const handleRouteSelect = async (routeId: string) => {
        if (!currentPlan) return;

        // Find the pending selection step
        const stepIndex = currentPlan.steps.findIndex((s: any) => s.status === 'pending_selection');
        if (stepIndex === -1) return;

        // Update plan with selection
        const updatedPlan = { ...currentPlan };
        updatedPlan.steps[stepIndex].selectedRouteId = routeId;
        updatedPlan.steps[stepIndex].status = 'pending'; // Reset to pending to trigger execution

        // Send back to agent
        await sendMessage('Route selected', updatedPlan);
    };

    const handleTokenSelect = async (address: string) => {
        if (!currentPlan) return;

        const stepIndex = currentPlan.steps.findIndex((s: any) => s.status === 'pending_token_selection');
        if (stepIndex === -1) return;

        const updatedPlan = { ...currentPlan };
        updatedPlan.steps[stepIndex].params.tokenInAddress = address;
        updatedPlan.steps[stepIndex].status = 'pending';

        await sendMessage('Token selected', updatedPlan);
    };

    const handleVoiceToggle = async () => {
        if (isRecording) {
            // Stop recording
            const audioBlob = await stopRecording();
            if (audioBlob) {
                setIsTranscribing(true);
                try {
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'recording.webm');

                    const response = await fetch('/api/transcribe', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();
                    if (data.text) {
                        setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
                    }
                } catch (error) {
                    console.error('Transcription error:', error);
                } finally {
                    setIsTranscribing(false);
                }
            }
        } else {
            // Start recording
            await startRecording();
        }
    };

    return (
        <div className="flex flex-col h-[600px] w-full bg-[#0A0A0F] rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center gap-4 sticky top-0 z-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Bot size={20} className="text-white" />
                </div>
                <div>
                    <h2 className="text-white font-bold text-lg tracking-tight">ChainGPT Copilot</h2>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Powered by BNB Chain & Quack
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mb-6 shadow-xl border border-white/5">
                            <Bot size={32} className="text-blue-400 opacity-80" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">How can I help you today?</h3>
                        <p className="text-gray-400 max-w-xs mb-8">I can help you audit contracts, generate code, or manage your portfolio on BNB Chain.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                            <button onClick={() => setInput("Create a meme token called DOGE")} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm text-gray-300 transition-all text-left hover:border-blue-500/30">
                                🪙 Create a Token
                            </button>
                            <button onClick={() => setInput("Check my portfolio risk")} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm text-gray-300 transition-all text-left hover:border-blue-500/30">
                                🛡️ Check Portfolio Risk
                            </button>
                            <button onClick={() => setInput("Audit contract at 0x...")} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm text-gray-300 transition-all text-left hover:border-blue-500/30">
                                🔍 Audit Contract
                            </button>
                            <button onClick={() => setInput("Swap 0.1 BNB to USDT")} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm text-gray-300 transition-all text-left hover:border-blue-500/30">
                                💸 Swap Tokens
                            </button>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'agent' && (
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                                <Bot size={16} className="text-blue-400" />
                            </div>
                        )}

                        <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm shadow-blue-900/20'
                            : 'bg-gray-800/80 backdrop-blur-sm text-gray-100 rounded-tl-sm border border-white/5'
                            }`}>
                            {/* Plan Visualization */}
                            {msg.plan && (
                                <div className="mb-3 bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
                                    <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Agent Plan</div>
                                    <div className="space-y-2">
                                        {msg.plan.steps.map((step: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-sm">
                                                {step.status === 'completed' ? (
                                                    <CheckCircle2 size={14} className="text-green-400" />
                                                ) : step.status === 'active' ? (
                                                    <Loader2 size={14} className="text-blue-400 animate-spin" />
                                                ) : (
                                                    <Circle size={14} className="text-gray-600" />
                                                )}
                                                <span className={`${step.status === 'completed' ? 'text-gray-300 line-through opacity-60' :
                                                    step.status === 'active' ? 'text-blue-200 font-medium' : 'text-gray-500'
                                                    }`}>
                                                    {step.description}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="whitespace-pre-wrap">{msg.content}</div>

                            {/* Code Block Preview (if any) */}
                            {msg.content.includes('```') && (
                                <div className="mt-2 text-xs text-gray-400 italic">Code generated above.</div>
                            )}

                            {/* Portfolio Dashboard */}
                            {msg.role === 'agent' && msg.plan?.steps.some((s: any) => s.type === 'portfolio_check' && s.status === 'completed') && (
                                <div className="mt-4">
                                    <PortfolioDashboard
                                        riskScore={msg.plan.steps.find((s: any) => s.type === 'portfolio_check').result?.riskScore || 0}
                                        assets={msg.plan.steps.find((s: any) => s.type === 'portfolio_check').result?.assets || []}
                                        riskyAssets={msg.plan.steps.find((s: any) => s.type === 'portfolio_check').result?.riskyAssets || []}
                                        onScan={() => sendMessage("Check my portfolio risk")}
                                    />
                                </div>
                            )}

                            {msg.txDraft && (
                                <button
                                    onClick={() => {
                                        setCurrentTxDraft(msg.txDraft);
                                        setCurrentRisk(msg.riskLevel || 'low');
                                        setShowModal(true);
                                    }}
                                    className="mt-2 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2 py-1 rounded transition-colors"
                                >
                                    Review Transaction
                                </button>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                                <User size={16} className="text-gray-300" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                            <Bot size={16} className="text-blue-400" />
                        </div>
                        <div className="bg-gray-800 p-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                            <span className="text-gray-400 text-sm">Thinking & Planning...</span>
                        </div>
                    </div>
                )}

                {currentTokenStep && currentTokenStep.tokenOptions && (
                    <TokenSelectionCard
                        tokens={currentTokenStep.tokenOptions}
                        onSelect={handleTokenSelect}
                    />
                )}

                {currentRouteStep && currentRouteStep.routes && (
                    <RouteSelectionCard
                        routes={currentRouteStep.routes}
                        onSelect={handleRouteSelect}
                    />
                )}

                {txHash && (
                    <TransactionStatus
                        txHash={txHash}
                        onSuccess={() => {
                            // Optional: Refresh portfolio or history
                        }}
                        currentPlan={currentPlan}
                        currentTxDraft={currentTxDraft}
                    />
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-gray-900/80 backdrop-blur-md">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl opacity-20 group-focus-within:opacity-100 transition duration-500 blur"></div>
                    <div className="relative flex items-center bg-gray-900 rounded-xl">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything..."
                            className="w-full bg-transparent border-none py-4 pl-4 pr-24 text-white placeholder-gray-500 focus:ring-0 outline-none"
                        />
                        <div className="absolute right-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleVoiceToggle}
                                disabled={isLoading || isTranscribing}
                                className={`p-2 rounded-lg transition-all ${isRecording
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {isTranscribing ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : isRecording ? (
                                    <Square size={18} fill="currentColor" />
                                ) : (
                                    <Mic size={18} />
                                )}
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            <TxPreviewModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={handleConfirmTx}
                txDraft={currentTxDraft}
                riskLevel={currentRisk}
                isSigning={isSigning}
                gasFee={
                    currentPlan?.steps.find((s: any) => s.type === 'swap_tokens')?.routes?.find((r: any) => r.id === currentPlan?.steps.find((s: any) => s.type === 'swap_tokens')?.selectedRouteId)?.gasFee
                }
            />
        </div>
    );
}
