# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ChainGPT Web3 Copilot is an AI-powered blockchain assistant built on BNB Chain. It integrates ChainGPT's LLM, Auditor, and Generator APIs with Quack x402 for gasless transactions (EIP-7702).

**Stack**: Next.js 16, React 19, TypeScript, Wagmi v2, Viem, RainbowKit, Tailwind CSS, Framer Motion

## Development Commands

### Core Commands
```bash
npm run dev          # Start development server (Next.js dev mode)
npm run build        # Build for production
npm start            # Run production build
npm run lint         # Run ESLint
```

### Environment Setup
Copy required environment variables to `.env.local`:
- `CHAINGPT_API_KEY` - ChainGPT API access
- `SPONSOR_PRIVATE_KEY` - Q402 sponsor wallet (for gasless tx)
- `BSCSCAN_API_KEY` - Contract verification
- `NEXT_PUBLIC_SUPABASE_URL` - Database connection
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Database auth
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect integration
- `NEXT_PUBLIC_Q402_DEMO_MODE` - Set to 'false' for live EIP-7702 (default 'true')

**Security**: Never commit `.env.local`. See `SECURITY_NOTICE.md` for credential rotation.

## Architecture

### High-Level Flow
1. **User Input** → Chat UI (`components/Chat.tsx`)
2. **Planning** → Agent creates multi-step execution plan (`lib/agent/intent.ts`)
3. **Execution** → Step-by-step processing via API routes (`app/api/agent/route.ts`)
4. **ChainGPT Integration** → LLM, Auditor, Generator calls (`lib/chaingpt/client.ts`)
5. **Transaction Building** → Swap, transfer, deploy (`lib/web3/txBuilder.ts`)
6. **Policy Check** → Spend limits, allowlists (`lib/web3/policy.ts`)
7. **Settlement** → Regular tx OR Q402 gasless (`lib/web3/quack.ts`)

### Directory Structure
```
app/
├── api/
│   ├── agent/              # Agent orchestration & step execution
│   ├── q402/               # Q402 EIP-7702 settlement facilitator
│   │   ├── settle/         # Gasless transaction settlement
│   │   ├── verify/         # Signature verification
│   │   └── health/         # Service health check
│   ├── tx/build/           # Transaction builder endpoint
│   └── contracts/          # Contract generation & audit endpoints
│
lib/
├── agent/
│   ├── intent.ts           # Intent parsing & multi-step planning
│   └── guardian.ts         # Portfolio risk analysis
├── chaingpt/
│   └── client.ts           # ChainGPT API wrapper (LLM, Auditor, Generator)
├── web3/
│   ├── client.ts           # Viem public/wallet clients
│   ├── policy.ts           # PolicyEngine: spend caps, allow/deny lists
│   ├── quack.ts            # Q402 EIP-7702 integration
│   ├── txBuilder.ts        # Swap, transfer, deploy transaction builders
│   ├── tokens.ts           # Token metadata & resolution
│   └── contracts/          # Contract bytecode & ABIs
└── supabase/               # Database client & migrations

components/
├── Chat.tsx                # Main chat interface
├── TxPreviewModal.tsx      # Transaction approval UI with Q402 toggle
├── PortfolioDashboard.tsx  # Risk analysis display
└── ...                     # Other UI components
```

### Agent Planning & Execution

The agent uses a **two-phase approach**:

1. **Planning Phase** (`lib/agent/intent.ts`)
   - Calls ChainGPT LLM with structured prompt to classify user intent
   - Returns multi-step execution plan with intent types: `swap_tokens`, `transfer_tokens`, `audit_contract`, `generate_contract`, `deploy_contract`, `portfolio_check`, `general_chat`
   - Falls back to heuristic pattern matching if LLM fails

2. **Execution Phase** (`app/api/agent/route.ts`)
   - Processes steps sequentially
   - Handles dependencies (e.g., deploy requires previous generate step)
   - Manages state: `pending` → `active` → `completed`/`failed`
   - Implements retry logic for transient errors

**Example Flow: "Create a simple token"**
```
Step 1: generate_contract  → ChainGPT Generator
Step 2: audit_contract     → ChainGPT Auditor (uses Step 1 output)
Step 3: deploy_contract    → Compile & build transaction
```

### Transaction Building

**Swap Flow** (`lib/web3/txBuilder.ts` - `buildSwap`)
- Resolves token symbols to addresses (handles ambiguity with user selection)
- Fetches real-time quotes from PancakeSwap V2 router
- Applies 3% slippage protection via `amountOutMin`
- Supports multi-route selection (A→B direct vs A→WBNB→B)
- Includes gas estimation

**Transfer Flow** (`lib/web3/txBuilder.ts` - `buildTransfer`)
- Supports native BNB and ERC20 tokens
- Validates recipient address format
- Checks sender balance before building transaction

**Deploy Flow** (`app/api/agent/route.ts` - `deploy_contract`)
- Uses generated contract bytecode from previous step
- Conservative gas estimation (~0.001 BNB)
- Risk assessment based on audit score

### Policy Engine

`lib/web3/policy.ts` enforces safety constraints:
- **Daily Spend Limit**: 10 BNB (resets every 24h)
- **Max Transaction**: 5 BNB per tx
- **Allowlists/Denylists**: Contract & token filtering
- **Price Oracle**: CoinGecko API with fallback to $650 conservative estimate

Applied to ALL transaction types before execution.

### Q402 Gasless Transactions

`lib/web3/quack.ts` implements EIP-7702 delegation:
1. User signs EIP-712 witness (payment authorization)
2. User signs EIP-7702 authorization (delegate EOA to implementation contract)
3. Submit to facilitator (`app/api/q402/settle/route.ts`)
4. Sponsor wallet pays gas on behalf of user

**Demo Mode**: Set `NEXT_PUBLIC_Q402_DEMO_MODE=true` for pre-EIP-7702 chains (simulated settlement). Set to `false` for production when EIP-7702 is live on BSC.

### ChainGPT Integration

`lib/chaingpt/client.ts` wraps three APIs:
- **generalChat**: LLM for planning, research, Q&A
- **auditContract**: Security analysis with risk scoring (0-100)
- **generateContract**: Solidity code generation from text

All methods include error handling with fallback behavior.

## Code Conventions

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- No `as` type assertions (create proper types instead)
- Path alias: `@/*` maps to project root
- React 19 with React Compiler enabled

### Import Pattern
```typescript
// External dependencies first
import { formatEther } from 'viem';
import { NextResponse } from 'next/server';

// Internal imports with @ alias
import { chainGPT } from '@/lib/chaingpt/client';
import { txBuilder } from '@/lib/web3/txBuilder';
```

### Async/Await
- Always use try-catch for external API calls
- Provide user-friendly error messages
- Log detailed errors to console for debugging

### Variable Naming
- Use full descriptive names (not abbreviations)
- Example: `userAddress` not `usrAddr`, `transactionHash` not `txHash`

## Key Patterns

### Intent-Based Architecture
User prompts are converted to structured intents rather than direct function calls. This allows:
- Multi-step workflows (generate → audit → deploy)
- LLM-based planning with heuristic fallback
- Step-by-step UI progress tracking

### Policy-First Transactions
All transactions pass through `defaultPolicy.checkTx()` before submission. This catches:
- Overspending before signing
- Blacklisted contracts
- Token allowlist violations

### Deterministic Price Feeds
Use `defaultPolicy.getBNBPrice()` for all USD conversions. Never rely on LLM for price data.

### Token Resolution
Multi-token symbols (e.g., multiple USDT contracts) trigger user selection UI with balance context.

## Testing & Deployment

### Local Testing
1. Connect to BSC Testnet (Chain ID: 97)
2. Get test BNB: https://testnet.bnbchain.org/faucet-smart
3. Test prompts:
   - "Swap 0.01 BNB for USDT"
   - "Check my portfolio risk"
   - "Audit contract 0x..."
   - "Create a simple token contract"

### Production Build
```bash
npm run build --webpack    # Explicit webpack flag (per package.json)
npm start                  # Verify build locally before deploy
```

### Deployment Checklist
- Set all environment variables in hosting platform (Vercel/Netlify)
- Set `NEXT_PUBLIC_Q402_DEMO_MODE=false` for live EIP-7702 settlement
- Ensure sponsor wallet has sufficient BNB for gas
- Rotate credentials if `.env.local` was ever committed (see `SECURITY_NOTICE.md`)

## Networks

- **BSC Testnet** (Chain ID: 97) - Primary development network
- **BSC Mainnet** (Chain ID: 56) - Production (when ready)

Default RPC endpoints configurable via:
- `RPC_URL_BSC_TESTNET`
- `RPC_URL_BSC_MAINNET`

## Dependencies Notes

- **q402**: GitHub package from `quackai-labs/Q402` (not npm)
- **wagmi/viem**: v2.x (latest stable)
- **Next.js**: v16 with React Compiler
- **RainbowKit**: v2.2.9 for wallet connection

## Common Issues

### "Policy violation" errors
Check `lib/web3/policy.ts` limits:
- Daily spend: 10 BNB
- Max tx: 5 BNB
- Review `dailySpend` counter (resets every 24h)

### Token not found
Add to `lib/web3/tokens.ts` with correct address and decimals for target chain.

### Q402 settlement failing
- Verify `NEXT_PUBLIC_Q402_DEMO_MODE` setting
- Check sponsor wallet balance
- Ensure both signatures are valid (EIP-712 witness + EIP-7702 authorization)

### ChainGPT API errors
- Validate `CHAINGPT_API_KEY` is set correctly
- Check API rate limits
- Review error logs in browser console for specific error messages
