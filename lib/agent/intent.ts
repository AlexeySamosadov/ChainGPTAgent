import { chainGPT } from '@/lib/chaingpt/client';

export type IntentType = 'audit_contract' | 'generate_contract' | 'deploy_contract' | 'swap_tokens' | 'transfer_tokens' | 'portfolio_check' | 'general_chat' | 'unknown';

export interface IntentStep {
    id: string;
    type: IntentType;
    description: string;
    params: Record<string, any>;
    status: 'pending' | 'active' | 'completed' | 'failed';
    result?: any;
    // For swap flow
    routes?: any[];
    selectedRouteId?: string;
    // Retry tracking
    retryCount?: number;
    canRetry?: boolean;
    errorCode?: string;
}

export interface AgentPlan {
    steps: IntentStep[];
    originalPrompt: string;
}

export class Planner {
    async plan(text: string): Promise<AgentPlan> {
        console.log('🧠 Planning with ChainGPT LLM for:', text);

        const prompt = `
You are an expert Web3 AI Agent Planner. Your job is to analyze the user's request and create a structured execution plan.
Available Intents:
- swap_tokens: User wants to swap/exchange tokens (e.g. "Swap BNB to USDT"). Params: { tokens: [in, out], amount: string }
- transfer_tokens: User wants to send tokens (e.g. "Send 0.1 BNB to 0x..."). Params: { to: string, amount: string, token: string }
- portfolio_check: User wants to check balance, risk, or portfolio (e.g. "Check my risk"). Params: {}
- audit_contract: User wants to audit a contract. Params: { address?: string, source?: string }
- generate_contract: User wants to create/generate code. Params: { description: string }
- general_chat: General questions. Params: { message: string }

Rules:
1. If the user wants to CREATE a token, always plan 3 steps: generate_contract -> audit_contract -> deploy_contract.
2. Return ONLY valid JSON. No markdown, no explanations.
3. Structure: { "steps": [ { "type": "...", "description": "...", "params": {...} } ] }
4. Handle currency units intelligently: "10 cents" -> "0.10", "half a BNB" -> "0.5".

User Request: "${text}"
JSON Plan:
`;

        try {
            // Call ChainGPT LLM
            // Note: In a real production env, we might use a specific 'planner' model or fine-tuned endpoint.
            // Here we use the general chat endpoint with a strict system prompt.
            const response = await chainGPT.generalChat(prompt);

            // Clean response (remove markdown if any)
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            const steps: IntentStep[] = parsed.steps.map((s: any, i: number) => ({
                id: `step_${i + 1}`,
                type: s.type,
                description: s.description,
                params: s.params || {},
                status: 'pending'
            }));

            return {
                steps,
                originalPrompt: text
            };

        } catch (error) {
            console.error('LLM Planning Failed, falling back to heuristic:', error);
            return this.heuristicPlan(text);
        }
    }

    // Fallback for reliability (or if API key is missing/invalid)
    heuristicPlan(text: string): AgentPlan {
        const lowerText = text.toLowerCase();
        const steps: IntentStep[] = [];

        // 1. Check for "Create/Generate Token" -> "Deploy" flow
        if ((lowerText.includes('create') || lowerText.includes('generate')) &&
            (lowerText.includes('token') || lowerText.includes('contract'))) {
            steps.push({ id: 'step_1', type: 'generate_contract', description: 'Generate Smart Contract Code', params: { description: text }, status: 'pending' });
            steps.push({ id: 'step_2', type: 'audit_contract', description: 'Audit Generated Code for Security', params: { source: 'prev_step_result' }, status: 'pending' });
            steps.push({ id: 'step_3', type: 'deploy_contract', description: 'Deploy Contract to BNB Chain', params: { source: 'prev_step_result' }, status: 'pending' });
        }
        // 2. Check for Swap
        else if (lowerText.includes('swap') || lowerText.includes('buy') || lowerText.includes('sell')) {
            const tokens = text.match(/[A-Z]{2,}/g) || ['BNB', 'USDT'];
            const amountMatch = text.match(/(\d+(\.\d+)?)/);
            const amount = amountMatch ? amountMatch[0] : '0.01';
            steps.push({ id: 'step_1', type: 'swap_tokens', description: `Swap ${amount} ${tokens[0]} for ${tokens[1]}`, params: { tokens, amount }, status: 'pending' });
        }
        // 3. Check for Transfer
        else if (lowerText.includes('transfer') || lowerText.includes('send')) {
            const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
            const amountMatch = text.match(/\d+(\.\d+)?/);
            steps.push({ id: 'step_1', type: 'transfer_tokens', description: `Transfer ${amountMatch?.[0] || '?'} BNB to ${addressMatch?.[0] || 'recipient'}`, params: { to: addressMatch?.[0], amount: amountMatch?.[0] }, status: 'pending' });
        }
        // 4. Check for Portfolio Analysis
        else if (lowerText.includes('portfolio') || lowerText.includes('risk') || lowerText.includes('guardian')) {
            steps.push({ id: 'step_1', type: 'portfolio_check', description: 'Analyze Portfolio Risks', params: { address: 'user_wallet' }, status: 'pending' });
        }
        // Default
        if (steps.length === 0) {
            steps.push({ id: 'step_1', type: 'general_chat', description: 'Process Request with ChainGPT LLM', params: { message: text }, status: 'pending' });
        }

        return { steps, originalPrompt: text };
    }
}

export const planner = new Planner();
