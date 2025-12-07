# ChainGPT Agent - Technical Documentation

## 1. Architecture Overview

The ChainGPT Agent is a sophisticated Web3 AI assistant designed to bridge natural language intent with blockchain execution. It operates on a **Client-Server-Agent** architecture where the Next.js frontend handles state and wallet interaction, while the API layer orchestrates AI planning and transaction construction.

```mermaid
graph TD
    User[User] -->|Chat| FE[Frontend (Next.js)]
    FE -->|Wallet Sign| Wallet[RainbowKit/Wagmi]
    FE -->|API Call| AgentAPI[Agent API Route]
    
    subgraph "Agent Core"
        AgentAPI -->|Step 1| Planner[Intent Planner]
        Planner -->|LLM Call| ChainGPT[ChainGPT API]
        Planner -->|Plan| Executor[Step Executor]
        
        Executor -->|Audit| Auditor[Audit Engine]
        Executor -->|Gen Code| Generator[Contract Generator]
        Executor -->|Tx Build| TxBuilder[Transaction Builder]
    end
    
    subgraph "Security Layer"
        TxBuilder -->|Validation| Policy[Policy Engine]
        Policy -->|Check| Limits[Spend Limits & Whitelists]
        Policy -->|Oracle| PriceFeed[CoinGecko Price Feed]
    end

    Executor -->|Response| FE
```

## 2. Core Components

### 2.1 Intent Planner (`lib/agent/intent.ts`)
The brain of the agent. It takes raw user input ("Swap 1 BNB for USDT") and converts it into a structured JSON execution plan.
- **LLM-Driven**: Uses ChainGPT's general chat endpoint with a strict system prompt to force JSON output.
- **Heuristic Fallback**: A deterministic fallback parser handles common regex patterns (swap, transfer, create) if the LLM is unavailable or fails.
- **State Machine**: The plan consists of sequential `IntentStep` items (e.g., `generate_contract` -> `audit_contract` -> `deploy_contract`).

### 2.2 ChainGPT Client (`lib/chaingpt/client.ts`)
A specialized wrapper around the ChainGPT API.
- **General Chat**: Context-aware conversation handling.
- **Auditor**: Sends Solidity code to the `smart_contract_auditor` model and parses structured vulnerabilities and risk scores from the text response.
- **Generator**: Requests `smart_contract_generator` model output and extracts Solidity code blocks.

### 2.3 Policy Engine (`lib/web3/policy.ts`)
A critical security layer that sits between intent and execution.
- **Spend Limits**: Enforces daily caps (e.g., 10 BNB/day) and per-tx caps.
- **Whitelists/Blacklists**: Blocks interactions with known malicious addresses or unapproved tokens.
- **Price Oracle**: Fetches real-time BNB prices from CoinGecko to calculate USD-equivalent risk exposure. Verification is done locally to ensure no "hallucinated" low prices.

### 2.4 Transaction Builder (`lib/web3/txBuilder.ts`)
Constructs viable EVM transactions based on high-level intents.
- **Swaps**: Integrates with PancakeSwap V2 (Router/Factory) to find paths and quote amounts. Calculates strict `amountOutMin` for slippage protection.
- **Transfers**: Simple native and ERC20 transfer construction with checksum address validation.

## 3. Data Flow

1.  **User Input**: "Audit this contract 0x123..."
2.  **API Route (`/api/agent`)**: Receives the message and current conversation history.
3.  **Planning**: The `Planner` identifies the intent `audit_contract`.
4.  **Execution**: The agent fetches the source code (if verified) or expects the user to paste it. If source is present, it calls `chainGPT.auditContract()`.
5.  **Result**: The audit score and vulnerabilities are returned.
6.  **Response**: The agent formats a markdown response and updates the chat UI.

## 4. Security Considerations

- **Non-Custodial**: The agent *never* holds user private keys. All transactions are constructed by the server but **must be signed by the user** in their local wallet (Metamask, etc.).
- **Environment Variables**: API keys for ChainGPT and other services are stored in `.env.local` and never exposed to the client.
- **Policy Enforcement**: Even if the AI hallucinates a malicious transaction (e.g., "send all funds"), the Policy Engine provides a deterministic code-level check to block it if it exceeds limits or hits a blacklist.

## 5. Technology Stack Details

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Web3 Hooks**: Wagmi v2 + Viem (Type-safe Ethereum interactions)
- **State Management**: React Context + Hooks (`useAgentChat`)
- **Integration**: Q402 (for gas-sponsored transactions)
