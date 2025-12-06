# ChainGPT Web3 Copilot - Design Brief

## 1. Product Overview
**Product Name:** ChainGPT Web3 Copilot
**Platform:** Web Application (Desktop & Mobile)
**Core Function:** An AI-powered assistant that helps users interact with the BNB Chain. It translates natural language commands (e.g., "Create a token", "Swap BNB") into executed blockchain transactions.

## 2. Target Audience
*   **Web3 Developers:** Prototyping contracts and auditing code.
*   **Crypto Traders:** Swapping tokens and checking portfolio risks.
*   **Degens:** Launching meme tokens quickly and safely.

## 3. Key User Flows & UI Requirements

### A. The Chat Interface (Main Hub)
*   **Function:** The primary interaction point. Users type commands, Agent responds.
*   **Key Elements:**
    *   **Input Field:** Prominent, floating, easy to access. Needs to feel "smart" (e.g., glowing active state).
    *   **Message Bubbles:** Clear distinction between User (Right) and Agent (Left).
    *   **Plan Visualization:** When the Agent performs complex tasks (e.g., "Generating Contract"), we need to show a "Thinking..." state or a checklist of steps (Generate -> Audit -> Deploy) so the user knows what's happening.
    *   **Rich Content:** The Agent returns more than text. It returns Code Blocks (Solidity), Risk Cards (Red/Green indicators), and Transaction Previews.

### B. Transaction Preview Modal (Critical)
*   **Function:** The "Checkout" screen before a user signs a transaction.
*   **Key Elements:**
    *   **Action Summary:** "Deploying Contract" or "Swapping 0.1 BNB -> USDT".
    *   **Risk Meter:** A visual indicator (Low/Medium/High Risk). High risk should be alarming (Red).
    *   **Data Fields:** To, From, Value, Gas Estimate.
    *   **Action Buttons:** "Confirm & Sign" (Primary) vs "Reject" (Secondary).

### C. Portfolio Guardian (Risk Dashboard)
*   **Function:** Displays the health of the user's wallet.
*   **Key Elements:**
    *   **Risk Score:** A large gauge or percentage (0-100).
    *   **Asset List:** List of tokens with "Safe" or "Suspicious" tags.
    *   **Alerts:** Warning cards for Honeypots or high-risk assets.

### D. Navigation & Controls
*   **Network Toggle:** A switch to toggle between **BNB Mainnet** (Real Money) and **BNB Testnet** (Playground). Needs to be visible but not intrusive.
*   **Wallet Connection:** Standard "Connect Wallet" button, showing the connected address and avatar.

## 4. Aesthetic Direction ("Winning MVP")
*   **Vibe:** Premium, Futuristic, AI-Native, Trustworthy.
*   **Color Palette:**
    *   **Background:** Deep Dark (Midnight Blue / Black).
    *   **Accents:** Electric Blue (AI), Neon Purple (Creative), Emerald Green (Success/Safe), Crimson Red (Danger/Risk).
*   **Style:**
    *   **Glassmorphism:** Translucent panels, blurs, depth.
    *   **Gradients:** Subtle background glows to make the app feel "alive".
    *   **Typography:** Clean, monospaced fonts for code/data, modern sans-serif for chat.

## 5. Current Pain Points (To Fix)
*   The current UI is too "flat" and basic.
*   Lack of visual hierarchy between simple chat and critical transaction requests.
*   "Thinking" states need better animation.
