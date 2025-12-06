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

    const executeStep = async (text: string, planToExecute?: any) => {
        setIsLoading(true);
        try {
            const response = await axios.post('/api/agent', {
                message: text,
                userAddress: address,
                chainId: chainId,
                plan: planToExecute || currentPlan
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

        await executeStep(text, planUpdate);
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
