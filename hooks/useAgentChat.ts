import { useState, useCallback } from 'react';
import axios from 'axios';
import { useAccount } from 'wagmi';

export interface Message {
    role: 'user' | 'agent';
    content: string;
    txDraft?: any;
    riskLevel?: 'low' | 'medium' | 'high';
    plan?: any;
    stepResult?: any; // Result from completed step
    stepType?: string; // Type of the completed step
}

export interface CompletedStep {
    type: string;
    result: any;
    params?: any;
}

export function useAgentChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { address, chainId } = useAccount();

    // Track current plan state
    const [currentPlan, setCurrentPlan] = useState<any>(null);

    // Track completed steps for history
    const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);

    const executeStep = async (text: string, planToExecute?: any, history: Message[] = []) => {
        setIsLoading(true);
        try {
            // Filter history to last 6 messages to save tokens/size, excluding the current one if redundant
            const recentHistory = history.slice(-6).map(m => ({ role: m.role, content: m.content }));

            const response = await axios.post('/api/agent', {
                message: text,
                userAddress: address,
                chainId: chainId,
                plan: planToExecute || currentPlan,
                history: recentHistory
            });

            const data = response.data;

            // Update local plan state
            if (data.plan) {
                setCurrentPlan(data.plan);
            }

            // Extract completed step info
            let stepResult: any = undefined;
            let stepType: string | undefined = undefined;

            if (data.currentStep && data.currentStep.status === 'completed') {
                stepType = data.currentStep.type;
                stepResult = data.currentStep.result;

                // Add to completed steps
                setCompletedSteps(prev => [...prev, {
                    type: stepType as string,
                    result: stepResult,
                    params: data.currentStep.params
                }]);
            }

            const agentMsg: Message = {
                role: 'agent',
                content: data.message,
                txDraft: data.txDraft,
                riskLevel: data.riskLevel,
                plan: data.plan,
                stepResult,
                stepType,
            };

            setMessages((prev) => [...prev, agentMsg]);

            // Check if there are more pending steps
            if (data.plan) {
                const hasPending = data.plan.steps.some((s: any) => s.status === 'pending');
                if (hasPending) {
                    // Continue execution automatically
                    setTimeout(() => {
                        executeStep('continue_execution', data.plan);
                    }, 1000);
                    return; // Keep loading true
                }
            }
        } catch (error) {
            console.error('Chat Error:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'agent', content: 'Sorry, something went wrong.' },
            ]);
        }
        setIsLoading(false);
    };

    const sendMessage = async (text: string, planUpdate?: any) => {
        const userMsg: Message = { role: 'user', content: text };
        setMessages((prev) => [...prev, userMsg]);

        // If planUpdate is provided (e.g. route selection), update state
        if (planUpdate) {
            setCurrentPlan(planUpdate);
        }

        let planToSend = planUpdate || currentPlan;

        // If the current plan has failed OR is fully completed, we should reset it to allow replanning with context
        if (!planUpdate && currentPlan) {
            const hasFailed = currentPlan.steps.some((s: any) => s.status === 'failed');
            const isCompleted = currentPlan.steps.every((s: any) => s.status === 'completed');

            if (hasFailed || isCompleted) {
                console.log('Previous plan finished (failed/completed). Resetting for new plan with context.');
                planToSend = null;
                setCurrentPlan(null);
            }
        }

        await executeStep(text, planToSend, messages);
    };

    const clearCompletedSteps = useCallback(() => {
        setCompletedSteps([]);
    }, []);

    return {
        messages,
        sendMessage,
        isLoading,
        currentPlan,
        completedSteps,
        clearCompletedSteps
    };
}
