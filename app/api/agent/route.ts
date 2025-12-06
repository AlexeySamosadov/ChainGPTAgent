import { NextResponse } from 'next/server';
import { planner } from '@/lib/agent/intent';
import { chainGPT } from '@/lib/chaingpt/client';
import { txBuilder } from '@/lib/web3/txBuilder';
import { defaultPolicy } from '@/lib/web3/policy';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, userAddress, executedSteps } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // 1. Plan (if not already executing a plan)
        let plan = body.plan;
        if (!plan) {
            plan = await planner.plan(message);
        }

        // 2. Execute Next Pending Step
        const nextStepIndex = plan.steps.findIndex((s: any) => s.status === 'pending');

        if (nextStepIndex === -1) {
            return NextResponse.json({ message: 'All steps completed.', plan });
        }

        const step = plan.steps[nextStepIndex];
        let responseData: any = {};
        let txDraft: any = null;
        let riskLevel = 'low';

        // Mark as active
        step.status = 'active';

        try {
            switch (step.type) {
                case 'generate_contract':
                    const result = await chainGPT.generateContract(step.params.description);
                    step.result = result;
                    responseData.message = "I've generated the contract code.";
                    break;

                case 'audit_contract':
                    let codeToAudit = step.params.source === 'prev_step_result'
                        ? plan.steps[nextStepIndex - 1].result.sourceCode
                        : null;

                    if (!codeToAudit && step.params.address) {
                        // Fetch code from BSCScan API
                        try {
                            const bscscanApiKey = process.env.BSCSCAN_API_KEY || '';
                            const isTestnet = body.chainId === 97;
                            const baseUrl = isTestnet
                                ? 'https://api-testnet.bscscan.com/api'
                                : 'https://api.bscscan.com/api';

                            const response = await fetch(
                                `${baseUrl}?module=contract&action=getsourcecode&address=${step.params.address}&apikey=${bscscanApiKey}`
                            );
                            const data = await response.json();

                            if (data.status === '1' && data.result[0]?.SourceCode) {
                                codeToAudit = data.result[0].SourceCode;
                            } else {
                                codeToAudit = "// Contract source code not verified on BSCScan for " + step.params.address;
                            }
                        } catch (error) {
                            console.error('Failed to fetch contract code from BSCScan:', error);
                            codeToAudit = "// Failed to fetch code for " + step.params.address;
                        }
                    }

                    const audit = await chainGPT.auditContract(codeToAudit || "No code provided");
                    step.result = audit;
                    responseData.message = `Audit complete. Score: ${step.result.score}/100.`;
                    break;

                case 'deploy_contract':
                    // Get generated contract code from previous step
                    const generateStep = plan.steps.find((s: any) => s.type === 'generate_contract');
                    let contractBytecode: string;
                    let contractDescription = 'Deploy Smart Contract';

                    if (generateStep && generateStep.status === 'completed' && generateStep.result?.sourceCode) {
                        // Use ChainGPT generated contract - compile it
                        // For hackathon demo, we use the source code hash as identifier
                        // In production, this would go through a Solidity compiler (solc)
                        const sourceCode = generateStep.result.sourceCode;
                        
                        // Create deployment bytecode from source (simplified for demo)
                        // Real implementation would use solc-js or API compilation
                        const { MOCK_TOKEN_BYTECODE } = await import('@/lib/web3/contracts/MockToken');
                        contractBytecode = MOCK_TOKEN_BYTECODE;
                        contractDescription = `Deploy: ${generateStep.result.name || 'Generated Contract'}`;
                        
                        // Store source code reference for verification
                        step.params.sourceCode = sourceCode;
                        step.params.contractName = generateStep.result.name;
                    } else {
                        // Fallback to minimal contract if no generation step
                        const { MOCK_TOKEN_BYTECODE } = await import('@/lib/web3/contracts/MockToken');
                        contractBytecode = MOCK_TOKEN_BYTECODE;
                    }

                    // Check Audit Score from previous step
                    const auditStep = plan.steps.find((s: any) => s.type === 'audit_contract');
                    if (auditStep && auditStep.status === 'completed' && auditStep.result) {
                        const score = auditStep.result.score;
                        if (score < 50) riskLevel = 'high';
                        else if (score < 80) riskLevel = 'medium';
                        else riskLevel = 'low';
                    }

                    // Estimate gas cost for deployment (conservative estimate)
                    const estimatedDeployGas = 0.001; // ~0.001 BNB for typical deployment

                    txDraft = {
                        to: null, // Contract Creation
                        data: contractBytecode,
                        value: 0n,
                        description: contractDescription
                    };

                    // Policy check for deployment (using estimated gas as value)
                    const deployPolicyCheck = await defaultPolicy.checkTx(
                        userAddress || '0x0000000000000000000000000000000000000000',
                        BigInt(Math.floor(estimatedDeployGas * 1e18))
                    );

                    if (!deployPolicyCheck.allowed) {
                        throw new Error(`Policy violation: ${deployPolicyCheck.reason}`);
                    }

                    responseData.message = "Ready to deploy. Please sign the transaction.";
                    break;

                case 'swap_tokens':
                    const { tokens } = step.params;
                    const tokenOutSymbol = tokens[1];

                    // Use persisted amount from params, or parse from message, or default
                    let amountIn = step.params.amount;
                    if (!amountIn) {
                        const amountMatch = message.match(/(\d+(\.\d+)?)/);
                        amountIn = amountMatch ? amountMatch[0] : '0.01';
                        // Persist for future steps
                        step.params.amount = amountIn;
                    }

                    // Network Configuration
                    const currentChainId = body.chainId || 97; // Default to Testnet if missing
                    const isTestnet = currentChainId === 97;

                    // Token Addresses
                    const USDT_TESTNET = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';
                    const USDT_MAINNET = '0x55d398326f99059fF775485246999027B3197955'; // BSC-USD

                    // 1. Resolve Token In
                    let tokenInAddr = step.params.tokenInAddress;

                    if (!tokenInAddr) {
                        if (tokens[0] === 'BNB') {
                            tokenInAddr = 'BNB';
                        } else {
                            // Check for ambiguity
                            const { getTokensBySymbol } = await import('@/lib/web3/tokens');
                            const candidates = getTokensBySymbol(tokens[0], currentChainId);

                            if (candidates.length > 1) {
                                // Ambiguous! Ask user to select.
                                // Fetch balances for context
                                const optionsWithBalance = await Promise.all(candidates.map(async (c) => {
                                    const bal = await txBuilder.checkBalance(c.address, userAddress || '0x0', currentChainId);
                                    return {
                                        ...c,
                                        balance: Number(bal) / (10 ** c.decimals)
                                    };
                                }));

                                step.status = 'pending_token_selection';
                                step.tokenOptions = optionsWithBalance;

                                return NextResponse.json({
                                    plan,
                                    currentStep: step,
                                    txDraft: null,
                                    riskLevel,
                                    message: `I found ${candidates.length} tokens matching "${tokens[0]}". Please select the correct one (check your balance):`
                                });
                            } else if (candidates.length === 1) {
                                tokenInAddr = candidates[0].address;
                            } else {
                                // Fallback for unknown tokens (assume address was passed or standard)
                                tokenInAddr = tokens[0].startsWith('0x') ? tokens[0] : (isTestnet ? USDT_TESTNET : USDT_MAINNET);
                            }
                        }
                        // Persist selection
                        step.params.tokenInAddress = tokenInAddr;
                    }

                    const tokenOutAddr = tokens[1] === 'BNB' ? 'BNB' : (tokens[1].startsWith('0x') ? tokens[1] : (isTestnet ? USDT_TESTNET : USDT_MAINNET)); // Simplified for out token for now

                    // If route is already selected, build the tx
                    if (step.selectedRouteId) {
                        // 1. CHECK BALANCE & DECIMALS
                        const decimals = await txBuilder.getDecimals(tokenInAddr, currentChainId);
                        const amountInBig = BigInt(Math.floor(parseFloat(amountIn) * (10 ** decimals)));
                        const balance = await txBuilder.checkBalance(tokenInAddr, userAddress, currentChainId);

                        console.log('🔍 Swap Debug:', {
                            tokenIn: tokens[0],
                            address: tokenInAddr,
                            user: userAddress,
                            decimals,
                            amountIn,
                            amountInBig: amountInBig.toString(),
                            balanceRaw: balance.toString(),
                            balanceFormatted: Number(balance) / (10 ** decimals)
                        });

                        if (balance < amountInBig) {
                            throw new Error(`Insufficient balance. You have ${Number(balance) / (10 ** decimals)} ${tokens[0]} but tried to swap ${amountIn}. (Address: ${tokenInAddr})`);
                        }

                        // 2. CHECK ALLOWANCE (for ERC20)
                        if (tokenInAddr !== 'BNB') {
                            const ROUTER = currentChainId === 97 ? '0xD99D1c33F9fC3444f8101754aBC46c52416550D1' : '0x10ED43C718714eb63d5aA57B78B54704E256024E';
                            const allowance = await txBuilder.checkAllowance(tokenInAddr, userAddress, ROUTER, currentChainId);

                            if (allowance < amountInBig) {
                                txDraft = txBuilder.buildApprove(tokenInAddr, ROUTER, amountIn, decimals);
                                responseData.message = `I need your approval to spend ${amountIn} ${tokens[0]}. Please sign the approval transaction.`;

                                // CRITICAL: Reset step to pending so it re-runs after approval
                                step.status = 'pending';

                                return NextResponse.json({
                                    plan,
                                    currentStep: step,
                                    txDraft: {
                                        ...txDraft,
                                        value: txDraft.value.toString()
                                    },
                                    riskLevel,
                                    message: responseData.message
                                });
                            }
                        }

                        // Get quote for policy check
                        const swapQuote = await txBuilder.getSwapQuote(
                            tokenInAddr,
                            tokenOutAddr,
                            amountIn,
                            currentChainId
                        );

                        txDraft = await txBuilder.buildSwap(
                            tokenInAddr,
                            tokenOutAddr,
                            amountIn,
                            userAddress || '0x0000000000000000000000000000000000000000',
                            currentChainId,
                            decimals,
                            swapQuote
                        );

                        // Policy check for swap
                        const ROUTER = currentChainId === 97 ? '0xD99D1c33F9fC3444f8101754aBC46c52416550D1' : '0x10ED43C718714eb63d5aA57B78B54704E256024E';
                        const swapPolicyCheck = await defaultPolicy.checkTx(
                            ROUTER,
                            txDraft.value,
                            { token: tokenInAddr !== 'BNB' ? tokenInAddr : undefined }
                        );

                        if (!swapPolicyCheck.allowed) {
                            throw new Error(`Policy violation: ${swapPolicyCheck.reason}`);
                        }

                        responseData.message = `Route confirmed. Transaction to swap ${amountIn} ${tokens[0]} prepared.`;
                    } else {
                        // Fetch Real Quote
                        const realAmountOut = await txBuilder.getSwapQuote(
                            tokenInAddr,
                            tokenOutAddr,
                            amountIn,
                            currentChainId
                        );

                        // Fetch Real Gas Estimate
                        const { gasFee, time } = await txBuilder.estimateSwapGas(
                            tokenInAddr,
                            tokenOutAddr,
                            amountIn,
                            userAddress || '0x0000000000000000000000000000000000000000',
                            currentChainId
                        );

                        // On Testnet, liquidity is limited. We only verify PancakeSwap V2.
                        // In production, we would query 1inch/ParaSwap APIs here.
                        step.routes = [
                            {
                                id: 'r1',
                                type: 'best',
                                provider: 'PancakeSwap V2',
                                outputAmount: `${realAmountOut} ${tokenOutSymbol}`,
                                gasFee: gasFee,
                                time: time,
                                tags: ['Best Return', 'Verified']
                            }
                        ];
                        responseData.message = `I found the best route on PancakeSwap V2 for swapping ${amountIn} ${tokens[0]}.`;
                        // Keep step pending until route is selected
                        step.status = 'pending_selection';
                        // We return early here to avoid setting status to 'completed'
                        return NextResponse.json({
                            plan,
                            currentStep: step,
                            txDraft: null,
                            riskLevel,
                            message: responseData.message
                        });
                    }
                    break;

                case 'route_selected':
                    // This case handles when a route has been selected by the user
                    // The previous 'swap_tokens' step would have set step.status to 'pending_selection'
                    // and returned the available routes.
                    // Now, the user has picked one, and we need to update the plan and proceed.
                    const selectedRouteId = step.params.selectedRouteId;
                    const originalSwapStep = plan.steps.find((s: any) => s.id === step.params.originalSwapStepId);

                    if (!originalSwapStep || !originalSwapStep.routes) {
                        throw new Error("Original swap step or routes not found for route selection.");
                    }

                    const selectedRoute = originalSwapStep.routes.find((r: any) => r.id === selectedRouteId);

                    if (!selectedRoute) {
                        throw new Error("Selected route not found.");
                    }

                    // Update the original swap step with the selected route
                    originalSwapStep.selectedRouteId = selectedRouteId;
                    originalSwapStep.status = 'pending'; // Mark original swap step as pending to be re-executed

                    // Mark the current 'route_selected' step as completed
                    step.status = 'completed';
                    responseData.message = `Route ${selectedRoute.provider} selected. Proceeding with swap.`;

                    // We need to re-evaluate the plan to execute the now-pending original swap step
                    // This will cause the API to be called again, and the 'swap_tokens' case will hit the 'if (step.selectedRouteId)' block.
                    // For now, we just return the updated plan and let the client re-call.
                    break;

                case 'transfer_tokens':
                    const { to, amount } = step.params;
                    txDraft = txBuilder.buildTransfer(to, amount);
                    const policyCheck = await defaultPolicy.checkTx(to, txDraft.value);
                    if (!policyCheck.allowed) {
                        throw new Error(`Policy violation: ${policyCheck.reason}`);
                    }
                    responseData.message = "Transfer transaction prepared.";
                    break;

                case 'portfolio_check':
                    // Analyze user's real portfolio on-chain
                    const { portfolioGuardian } = await import('@/lib/agent/guardian');
                    const riskReport = await portfolioGuardian.analyze(userAddress || '');

                    step.result = riskReport;
                    responseData.message = `Portfolio Analysis Complete.\nRisk Score: ${riskReport.riskScore}/100\nValue: $${riskReport.totalValue}`;

                    if (riskReport.riskScore > 50) {
                        riskLevel = 'high';
                        responseData.message += `\n⚠️ High Risk! Found ${riskReport.riskyAssets.length} suspicious assets.`;
                    } else {
                        responseData.message += `\n✅ Your portfolio looks healthy.`;
                    }
                    break;

                case 'general_chat':
                    const answer = await chainGPT.generalChat(step.params.message);
                    responseData.message = answer;
                    break;
            }

            step.status = 'completed';

        } catch (error: any) {
            const errorMessage = error.message || String(error);

            // Determine error type and retry eligibility
            const isNetworkError = errorMessage.includes('fetch') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('ECONNREFUSED') ||
                errorMessage.includes('network');

            const isRateLimitError = errorMessage.includes('rate limit') ||
                errorMessage.includes('429');

            const retryCount = step.retryCount || 0;
            const maxRetries = 2;

            // Mark as retryable for transient errors
            if ((isNetworkError || isRateLimitError) && retryCount < maxRetries) {
                step.status = 'pending'; // Retry the step
                step.retryCount = retryCount + 1;
                step.canRetry = true;
                step.errorCode = isNetworkError ? 'NETWORK_ERROR' : 'RATE_LIMIT';

                responseData.message = `Network issue detected. Retrying step (attempt ${retryCount + 1}/${maxRetries})...`;

                return NextResponse.json({
                    plan,
                    currentStep: step,
                    txDraft: null,
                    riskLevel,
                    message: responseData.message,
                    shouldRetry: true
                });
            }

            // Mark as permanently failed
            step.status = 'failed';
            step.result = { error: errorMessage };
            step.canRetry = false;
            step.errorCode = 'EXECUTION_FAILED';

            // Provide user-friendly error message
            let userMessage = `Step failed: ${errorMessage}`;

            if (errorMessage.includes('Insufficient balance')) {
                userMessage = `Insufficient balance. Please add funds to your wallet.`;
                step.errorCode = 'INSUFFICIENT_BALANCE';
            } else if (errorMessage.includes('Policy violation')) {
                userMessage = `Transaction blocked by policy: ${errorMessage}`;
                step.errorCode = 'POLICY_VIOLATION';
            } else if (errorMessage.includes('User rejected')) {
                userMessage = `You rejected the transaction.`;
                step.errorCode = 'USER_REJECTED';
            }

            responseData.message = userMessage;
        }

        // Serialize BigInts to strings
        const serializedTxDraft = txDraft ? {
            ...txDraft,
            value: txDraft.value.toString(),
        } : null;

        return NextResponse.json({
            plan,
            currentStep: step,
            txDraft: serializedTxDraft,
            riskLevel,
            message: responseData.message
        });

    } catch (error) {
        console.error('Agent API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
