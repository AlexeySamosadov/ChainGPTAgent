# ChainGPT Web3 Copilot

A powerful AI-powered Web3 assistant built on BNB Chain, integrating ChainGPT and Quack x402 for seamless, secure, and intelligent blockchain interactions.

![ChainGPT Copilot Demo](https://via.placeholder.com/800x400?text=ChainGPT+Copilot+Demo)

## Features

- 🤖 **AI-Powered Chat**: Interact with the blockchain using natural language.
- 🛡️ **Smart Contract Audit**: Instantly analyze contracts for vulnerabilities using ChainGPT Auditor.
- 📝 **Contract Generation**: Generate Solidity code from text descriptions.
- 💸 **Sign-to-Pay (Quack x402)**: Execute transactions without holding gas tokens (gas-sponsored).
- 🚦 **Policy Engine**: Built-in spend caps and allow/deny lists for safety.
- 🔄 **Swap & Transfer**: Integrated DEX routing and asset transfers.

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion
- **Web3**: Wagmi v2, Viem, RainbowKit
- **AI**: ChainGPT API (LLM, Auditor, Generator)
- **Security**: Custom Policy Engine, Quack x402 Integration

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd web3-copilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` file:
   ```env
   CHAINGPT_API_KEY=your_key_here
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   QUACK_API_KEY=your_quack_key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

## Hackathon Submission

### ChainGPT × Quack – Super Web3 Agent Bounty

This project implements all "Must Have" requirements for the ChainGPT x Quack bounty:

#### ✅ Must Have Requirements

1. **Chat UI with Wallet Connect**
   - Implementation: `components/Chat.tsx`, `app/page.tsx`
   - RainbowKit integration with BNB Chain support (testnet & mainnet)
   - Real-time chat interface with conversation history

2. **Research & Explain Functionality**
   - Implementation: `lib/chaingpt/client.ts` (`generalChat` method)
   - Natural language queries answered by ChainGPT LLM
   - Agent route: `app/api/agent/route.ts` (case: `general_chat`)

3. **Smart Contract Generation & Auditing**
   - Generation: `lib/chaingpt/client.ts` (`generateContract` method)
   - Auditing: `lib/chaingpt/client.ts` (`auditContract` method)
   - Full flow in agent: `app/api/agent/route.ts` (cases: `generate_contract`, `audit_contract`)
   - Risk scoring and security analysis integration

4. **Transaction Execution with Sign-to-Pay**
   - Q402 EIP-7702 Integration: `lib/web3/quack.ts`
   - Settlement API: `app/api/q402/settle/route.ts`
   - Real cryptographic signatures (EIP-712 witness + EIP-7702 authorization)
   - Policy checks for sponsor wallet with spend caps
   - UI toggle for gas payment method: `components/TxPreviewModal.tsx`
   - Demo mode for pre-EIP-7702 chains (configurable via `NEXT_PUBLIC_Q402_DEMO_MODE`)
   - **Note:** For local development, `NEXT_PUBLIC_Q402_DEMO_MODE` defaults to `'true'`, simulating settlement. For the live hackathon demo on BSC testnet, set `NEXT_PUBLIC_Q402_DEMO_MODE='false'` in your deployment environment so that `/api/q402/settle` performs real sponsored transactions. Ensure the sponsor wallet (`SPONSOR_PRIVATE_KEY`) has sufficient testnet BNB.

5. **Policy Engine & Safety**
   - Implementation: `lib/web3/policy.ts`
   - Features:
     - Daily spend limits (BNB-based)
     - Per-transaction amount caps
     - Token allowlists/denylists
     - Contract allowlists/denylists
     - Applied to all transaction types (transfers, swaps, deploys, Q402 settlements)
   - Deterministic BNB price lookup via CoinGecko API (no LLM dependency)

6. **Swap & Transfer Integration**
   - Swap builder: `lib/web3/txBuilder.ts` (`buildSwap` method)
   - Real quotes from PancakeSwap V2 with proper decimals handling
   - Slippage protection (3% default, configurable)
   - Multi-route support with gas estimation
   - Transfer builder: `lib/web3/txBuilder.ts` (`buildTransfer` method)

#### 🎯 Bonus Features

- **Retry Strategy**: `app/api/agent/route.ts` - automatic retry for transient network errors
- **Error Handling**: Machine-readable error codes and user-friendly messages
- **Gas Estimation**: Real-time gas cost calculation in USD using deterministic price feeds
- **Token Disambiguation**: Multi-token selection UI for ambiguous symbols
- **Plan Visualization**: Step-by-step execution tracking in UI

### 🔗 Links

- **GitHub Repository**: [GitHub Repository](https://github.com/YOUR_USERNAME/ChainGPTAgent) <!-- TODO: Replace with actual repo URL -->
- **Live Demo**: [Live Demo](https://your-app.vercel.app) <!-- TODO: Replace with actual Vercel deployment URL -->
- **Demo Video**: [Demo Video](https://youtube.com/watch?v=YOUR_VIDEO_ID) <!-- TODO: Replace with actual demo video URL -->

### 🧪 Testing Instructions

1. **Network**: Connect to **BSC Testnet** (Chain ID: 97)
2. **Get Test Funds**: https://testnet.bnbchain.org/faucet-smart
3. **Example Prompts**:
   - "Swap 0.01 BNB for USDT" (demonstrates swap + policy check)
   - "Check my portfolio risk" (demonstrates ChainGPT analysis)
   - "Audit contract 0x..." (demonstrates ChainGPT auditor)
   - "Create a simple token contract" (demonstrates full gen → audit → deploy flow)
4. **Q402 Testing**: Use the "🦆 Q402 Sponsor" toggle in the transaction preview modal

### 🔐 Security Notes

- All private keys and API credentials are stored in environment variables (never committed)
- See `SECURITY_NOTICE.md` for credential rotation instructions
- Policy engine enforces spend caps on both user and sponsor wallets
- Real slippage protection on all swaps (amountOutMin calculated from quotes)

### 📚 Architecture

```
app/
├── api/agent/         # Agent orchestration & step execution
├── api/q402/          # Q402 EIP-7702 settlement facilitator
components/            # React UI components
lib/
├── agent/             # Intent planning & guardian
├── chaingpt/          # ChainGPT API client
└── web3/              # Transaction building, policy, Q402
```

### 🚀 Future Improvements

- Multi-chain support (Ethereum, Polygon, etc.)
- Advanced routing via 1inch/ParaSwap aggregators
- On-chain policy enforcement via smart contracts
- EIP-7702 production deployment (when live on BSC mainnet)
- Portfolio tracking with historical analytics

## License

MIT
