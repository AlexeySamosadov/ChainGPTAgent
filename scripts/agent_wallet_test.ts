import { createWalletClient, http, parseEther, formatEther, decodeEventLog, erc20Abi } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const API_URL = 'http://localhost:3000/api/agent';
const KEY_FILE = path.join(process.cwd(), 'agent_wallet.key');

async function main() {
    console.log('🤖 Starting Accuracy Verification...');

    // 1. Load or Generate Wallet
    let privateKey;
    if (fs.existsSync(KEY_FILE)) {
        privateKey = fs.readFileSync(KEY_FILE, 'utf8').trim() as `0x${string}`;
        console.log('🔑 Loaded existing wallet.');
    } else {
        privateKey = generatePrivateKey();
        fs.writeFileSync(KEY_FILE, privateKey);
        console.log('🔑 Generated new wallet.');
    }

    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
        account,
        chain: bscTestnet,
        transport: http()
    });

    console.log(`📍 Agent Address: ${account.address}`);

    // 2. Check Balance
    const publicClient = await import('../lib/web3/client').then(m => m.publicClient);
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💰 Balance: ${formatEther(balance)} BNB`);

    if (balance < parseEther('0.002')) {
        console.log('\n⚠️  INSUFFICIENT FUNDS');
        console.log(`Please send at least 0.002 tBNB to: ${account.address}`);
        console.log('Once funded, run this script again.');
        return;
    }

    // 3. Execute Step 1: Swapping 0.001 BNB -> USDT
    console.log('\n--- Step 1: Swapping 0.001 BNB -> USDT ---');
    let stepResponse = await axios.post(API_URL, {
        message: "Swap 0.001 BNB to USDT",
        userAddress: account.address,
        chainId: 97
    });

    let plan = stepResponse.data.plan;
    let currentStep = stepResponse.data.currentStep;

    let estimatedOutput = '0';
    let estimatedGasFee = '0';

    if (currentStep.status === 'pending_selection') {
        const route = currentStep.routes[0];
        estimatedOutput = route.outputAmount.split(' ')[0]; // "0.5832 USDT" -> "0.5832"
        estimatedGasFee = route.gasFee; // "$0.05"

        console.log(`📊 ESTIMATED:`);
        console.log(`   Output: ${estimatedOutput} USDT`);
        console.log(`   Gas Fee: ${estimatedGasFee}`);

        const routeId = route.id;

        // Update plan manually
        plan.steps.find((s: any) => s.status === 'pending_selection').selectedRouteId = routeId;
        plan.steps.find((s: any) => s.status === 'pending_selection').status = 'pending';

        stepResponse = await axios.post(API_URL, {
            message: "Confirm Swap",
            plan: plan,
            userAddress: account.address,
            chainId: 97
        });
    }

    if (stepResponse.data.txDraft) {
        const txDraft = stepResponse.data.txDraft;

        const hash = await client.sendTransaction({
            to: txDraft.to,
            data: txDraft.data,
            value: BigInt(txDraft.value)
        });
        console.log(`🚀 Tx Sent: ${hash}`);
        console.log(`🔗 Explorer: https://testnet.bscscan.com/tx/${hash}`);

        console.log('⏳ Waiting for receipt...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // --- ANALYSIS ---
        console.log('\n--- 📉 ACTUAL RESULTS ---');

        // 1. Gas Analysis
        const gasUsed = receipt.gasUsed;
        const effectiveGasPrice = receipt.effectiveGasPrice;
        const actualGasCostBNB = Number(gasUsed * effectiveGasPrice) / 1e18;
        const bnbPriceMock = 650; // Using same mock price as Agent for fair comparison
        const actualGasCostUSD = (actualGasCostBNB * bnbPriceMock).toFixed(2);

        console.log(`   Gas Used: ${gasUsed.toString()}`);
        console.log(`   Gas Price: ${formatEther(effectiveGasPrice)} BNB`);
        console.log(`   Actual Cost: $${actualGasCostUSD} (approx)`);
        console.log(`   Agent Est:   ${estimatedGasFee}`);

        // 2. Output Analysis
        // Find USDT Transfer event to our address
        const USDT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'.toLowerCase();
        let actualOutput = '0';

        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === USDT_ADDRESS) {
                try {
                    const decoded = decodeEventLog({
                        abi: erc20Abi,
                        data: log.data,
                        topics: log.topics
                    });
                    if (decoded.eventName === 'Transfer' && (decoded.args as any).to.toLowerCase() === account.address.toLowerCase()) {
                        actualOutput = formatEther((decoded.args as any).value); // USDT has 18 decimals on BSC Testnet
                    }
                } catch (e) { }
            }
        }

        console.log(`   Actual Output: ${actualOutput} USDT`);
        console.log(`   Agent Est:     ${estimatedOutput} USDT`);

        const diff = Math.abs(parseFloat(actualOutput) - parseFloat(estimatedOutput));
        const percentDiff = (diff / parseFloat(estimatedOutput)) * 100;
        console.log(`   Difference: ${diff.toFixed(6)} USDT (${percentDiff.toFixed(2)}%)`);

        if (percentDiff < 5) {
            console.log('\n✅ ACCURACY CHECK PASSED (<5% deviation)');
        } else {
            console.log('\n⚠️  ACCURACY CHECK WARNING (>5% deviation)');
        }

    } else {
        console.error('❌ Error: No transaction draft returned.');
        return;
    }
}

main().catch(console.error);
