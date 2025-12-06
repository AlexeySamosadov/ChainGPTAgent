/**
 * Q402 Implementation Contract Deployment Script
 * 
 * Deploy the SignatureBasedExecutor contract to BSC Testnet
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-q402.ts --network bscTestnet
 * 
 * Or with ts-node:
 *   npx ts-node scripts/deploy-q402.ts
 */

import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

// Contract bytecode (compiled from SignatureBasedExecutor.sol)
// This is a placeholder - you need to compile the contract first
const CONTRACT_BYTECODE = '0x'; // TODO: Add compiled bytecode

async function main() {
    console.log('🚀 Q402 Implementation Contract Deployment');
    console.log('==========================================\n');

    // Load private key
    const keyFile = path.join(process.cwd(), 'agent_wallet.key');
    if (!fs.existsSync(keyFile)) {
        console.error('❌ No wallet key found. Please create agent_wallet.key');
        process.exit(1);
    }

    const privateKey = fs.readFileSync(keyFile, 'utf8').trim() as `0x${string}`;
    const account = privateKeyToAccount(privateKey);

    console.log(`📍 Deployer Address: ${account.address}`);

    // Create clients
    const publicClient = createPublicClient({
        chain: bscTestnet,
        transport: http(),
    });

    const walletClient = createWalletClient({
        account,
        chain: bscTestnet,
        transport: http(),
    });

    // Check balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💰 Balance: ${Number(balance) / 1e18} tBNB`);

    if (balance < parseEther('0.01')) {
        console.error('❌ Insufficient balance for deployment. Need at least 0.01 tBNB');
        process.exit(1);
    }

    // For now, since we don't have the compiled bytecode, let's provide instructions
    console.log('\n📋 Deployment Instructions:');
    console.log('============================\n');
    console.log('Since EIP-7702 is not yet live on BSC, you have two options:\n');

    console.log('Option 1: Use Remix IDE (Recommended for hackathon)');
    console.log('---------------------------------------------------');
    console.log('1. Go to https://remix.ethereum.org');
    console.log('2. Create a new file: SignatureBasedExecutor.sol');
    console.log('3. Copy the contract from contracts/SignatureBasedExecutor.sol');
    console.log('4. Compile with Solidity 0.8.20');
    console.log('5. Deploy to BSC Testnet using MetaMask');
    console.log('6. Copy the deployed contract address');
    console.log('7. Update .env.local with:');
    console.log('   NEXT_PUBLIC_Q402_IMPLEMENTATION_BSC_TESTNET=<deployed_address>');
    console.log('   NEXT_PUBLIC_Q402_VERIFIER_BSC_TESTNET=<deployed_address>\n');

    console.log('Option 2: Use Hardhat');
    console.log('---------------------');
    console.log('1. Install Hardhat: npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox');
    console.log('2. Initialize: npx hardhat init');
    console.log('3. Configure hardhat.config.ts for BSC Testnet');
    console.log('4. Run: npx hardhat run scripts/deploy-q402.ts --network bscTestnet\n');

    console.log('📝 Note about EIP-7702:');
    console.log('=======================');
    console.log('EIP-7702 is expected in Ethereum Pectra upgrade (Q2-Q3 2025).');
    console.log('BSC will adopt it after Ethereum.');
    console.log('For the hackathon demo, the contract works with standard approve+transferFrom.');
    console.log('The Q402 signatures are still real and verifiable!\n');

    // Output the contract address placeholder for .env.local
    console.log('🔧 After deployment, update .env.local:');
    console.log('----------------------------------------');
    console.log('NEXT_PUBLIC_Q402_IMPLEMENTATION_BSC_TESTNET=0x<YOUR_CONTRACT_ADDRESS>');
    console.log('NEXT_PUBLIC_Q402_VERIFIER_BSC_TESTNET=0x<YOUR_CONTRACT_ADDRESS>');
}

main().catch(console.error);