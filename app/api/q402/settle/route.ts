import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { defaultPolicy } from '@/lib/web3/policy';

export const runtime = 'edge';

// Q402 Settlement Route
// Submits EIP-7702 transaction to the blockchain

interface SignedPaymentPayload {
    witnessSignature: string;
    authorization: {
        chainId: number;
        address: string;
        nonce: number;
        yParity: number;
        r: string;
        s: string;
    };
    paymentDetails: {
        scheme: string;
        networkId: string;
        token: string;
        amount: string;
        to: string;
        implementationContract: string;
        witness: {
            domain: {
                name: string;
                version: string;
                chainId: number;
                verifyingContract: string;
            };
            types: Record<string, Array<{ name: string; type: string }>>;
            primaryType: string;
            message: {
                owner: string;
                token: string;
                amount: string;
                to: string;
                deadline: string;
                paymentId: string;
                nonce: string;
            };
        };
        authorization: {
            chainId: number;
            address: string;
            nonce: number;
        };
    };
}

// RPC URLs for different networks
const RPC_URLS: Record<string, string> = {
    'bsc-mainnet': process.env.RPC_URL_BSC_MAINNET || 'https://bsc-dataseed1.binance.org',
    'bsc-testnet': process.env.RPC_URL_BSC_TESTNET || 'https://data-seed-prebsc-1-s1.binance.org:8545',
};

export async function POST(request: NextRequest) {
    try {
        const payload: SignedPaymentPayload = await request.json();

        console.log('📤 Q402 Settle Request:', JSON.stringify(payload, null, 2));

        // 1. Validate payload
        if (!payload.witnessSignature || !payload.authorization || !payload.paymentDetails) {
            return NextResponse.json({
                success: false,
                error: 'Invalid payment payload',
            }, { status: 400 });
        }

        // 2. Get sponsor private key
        const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY || process.env.FACILITATOR_PRIVATE_KEY;
        if (!sponsorPrivateKey) {
            console.error('❌ Missing SPONSOR_PRIVATE_KEY environment variable');
            return NextResponse.json({
                success: false,
                error: 'Facilitator not configured - missing sponsor key',
            }, { status: 500 });
        }

        // 3. Get RPC URL for the network
        const rpcUrl = RPC_URLS[payload.paymentDetails.networkId];
        if (!rpcUrl) {
            return NextResponse.json({
                success: false,
                error: `Unsupported network: ${payload.paymentDetails.networkId}`,
            }, { status: 400 });
        }

        // 4. Create provider and wallet
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const facilitatorWallet = new ethers.Wallet(sponsorPrivateKey, provider);

        console.log(`💼 Using facilitator: ${facilitatorWallet.address}`);

        // 5. Extract witness message
        const witness = payload.paymentDetails.witness;
        const message = witness.message;

        // Get recipient address
        const recipient = message.to || payload.paymentDetails.to;
        if (!recipient) {
            return NextResponse.json({
                success: false,
                error: 'Missing recipient address',
            }, { status: 400 });
        }

        // 5a. Policy check for Q402 sponsor wallet
        const amountBigInt = BigInt(message.amount);
        const policyCheck = await defaultPolicy.checkTx(
            recipient,
            amountBigInt,
            { token: message.token !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? message.token : undefined }
        );

        if (!policyCheck.allowed) {
            console.error(`❌ Policy check failed: ${policyCheck.reason}`);
            return NextResponse.json({
                success: false,
                error: `Sponsor policy violation: ${policyCheck.reason}`,
            }, { status: 403 });
        }

        console.log(`✅ Policy check passed for ${message.amount} tokens`);


        // 6. Encode executeTransfer function call
        const SIGNATURE_EXECUTOR_ABI = [
            "function executeTransfer(address owner, address facilitator, address token, address recipient, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external",
        ];

        const executorInterface = new ethers.Interface(SIGNATURE_EXECUTOR_ABI);
        const callData = executorInterface.encodeFunctionData("executeTransfer", [
            message.owner,                    // owner
            facilitatorWallet.address,        // facilitator
            message.token,                    // token
            recipient,                        // recipient
            message.amount,                   // amount
            message.nonce,                    // nonce
            message.deadline,                 // deadline
            payload.witnessSignature          // signature
        ]);

        console.log(`📋 Transaction details:`);
        console.log(`   owner: ${message.owner}`);
        console.log(`   facilitator: ${facilitatorWallet.address}`);
        console.log(`   token: ${message.token}`);
        console.log(`   recipient: ${recipient}`);
        console.log(`   amount: ${message.amount}`);
        console.log(`   nonce: ${message.nonce}`);
        console.log(`   deadline: ${message.deadline}`);

        // 7. Get facilitator nonce and fee data
        const facilitatorNonce = await facilitatorWallet.getNonce();
        const feeData = await provider.getFeeData();

        // 8. Prepare EIP-7702 authorization tuple
        const authorizationTuple = {
            chainId: payload.authorization.chainId,
            address: payload.authorization.address,
            nonce: payload.authorization.nonce,
            signature: {
                r: payload.authorization.r,
                s: payload.authorization.s,
                yParity: payload.authorization.yParity as 0 | 1,
            },
        };

        // 9. Construct EIP-7702 transaction
        const tx = {
            type: 4,  // EIP-7702
            to: message.owner, // Target is User EOA (will be delegated)
            data: callData,
            authorizationList: [authorizationTuple],
            chainId: payload.authorization.chainId,
            nonce: facilitatorNonce,
            gasLimit: 300000n,
            maxFeePerGas: feeData.maxFeePerGas || ethers.parseUnits("3", "gwei"),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits("1.5", "gwei"),
        };

        console.log(`📤 Sending EIP-7702 transaction...`);
        console.log(`   Type: 0x04 (EIP-7702)`);
        console.log(`   From: ${facilitatorWallet.address} (Facilitator)`);
        console.log(`   To: ${message.owner} (User EOA)`);

        // 10. Send transaction
        const txResponse = await facilitatorWallet.sendTransaction(tx);
        console.log(`📝 Transaction submitted: ${txResponse.hash}`);

        // 11. Wait for confirmation
        const receipt = await txResponse.wait();

        if (!receipt) {
            return NextResponse.json({
                success: false,
                error: 'Transaction receipt not available',
                txHash: txResponse.hash,
            }, { status: 500 });
        }

        if (receipt.status === 1) {
            console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
            return NextResponse.json({
                success: true,
                txHash: txResponse.hash,
                blockNumber: receipt.blockNumber.toString(),
            });
        } else {
            console.error(`❌ Transaction reverted`);
            return NextResponse.json({
                success: false,
                error: 'Transaction reverted on-chain',
                txHash: txResponse.hash,
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ Q402 Settlement Error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Provide more detailed error information
        if (errorMessage.includes('insufficient funds')) {
            return NextResponse.json({
                success: false,
                error: 'Insufficient gas funds in facilitator wallet',
            }, { status: 500 });
        } else if (errorMessage.includes('nonce')) {
            return NextResponse.json({
                success: false,
                error: 'Invalid nonce - transaction may have already been executed',
            }, { status: 500 });
        } else if (errorMessage.includes('execution reverted')) {
            return NextResponse.json({
                success: false,
                error: 'Contract execution reverted - check signature and authorization',
            }, { status: 500 });
        }

        return NextResponse.json({
            success: false,
            error: errorMessage,
        }, { status: 500 });
    }
}