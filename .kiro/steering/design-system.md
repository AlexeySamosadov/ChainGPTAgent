---
inclusion: always
---

# Design System Rules - ChainGPT Web3 Copilot

## Overview
This is a Next.js 16 + React 19 + Tailwind CSS 4 Web3 application for BNB Chain.

## Design Tokens

### Colors (defined in `app/globals.css`)
```css
--color-primary: #2b6cee       /* Primary blue */
--color-safe: #00FF7F          /* Success/safe green */
--color-danger: #DC143C        /* Error/danger red */
--color-accent-purple: #BF40BF /* Accent purple */
--color-background-dark: #0A0A0F  /* Main dark background */
--color-background-light: #f6f6f8 /* Light mode background */
```

### Typography
- Font family: `Space Grotesk` (display), system fallbacks
- Use Tailwind text utilities: `text-xs`, `text-sm`, `text-lg`, `text-xl`, `text-2xl`

### Spacing
- Use Tailwind spacing scale: `p-2`, `p-3`, `p-4`, `gap-2`, `gap-3`, `mb-4`, etc.
- Standard padding for cards: `p-4` or `p-6`
- Standard gaps: `gap-2`, `gap-3`

## Component Patterns

### Location
All UI components are in `/components/*.tsx`

### Styling Approach
- Tailwind CSS utility classes
- Dark theme by default (`bg-[#0A0A0F]`, `text-white`)
- Glass morphism effects: `bg-white/5`, `backdrop-blur-md`, `border border-white/10`
- Gradients: `bg-gradient-to-br from-blue-500 to-purple-600`

### Common UI Patterns
```tsx
// Card container
className="bg-[#0A0A0F] rounded-2xl border border-white/10 shadow-2xl"

// Button primary
className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 rounded-lg transition-all"

// Button secondary
className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-300 transition-all"

// Input field
className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"

// Active tab
className="bg-blue-600/10 text-blue-400 border border-blue-600/20"

// Inactive tab
className="text-gray-400 hover:text-white hover:bg-white/5"
```

### Icon System
- Library: `lucide-react`
- Import: `import { IconName } from 'lucide-react'`
- Standard sizes: `size={16}`, `size={18}`, `size={20}`

## Frameworks & Libraries
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- RainbowKit + wagmi + viem (Web3)
- Framer Motion (animations)
- lucide-react (icons)

## Asset Management
- Static assets in `/public/`
- SVG icons preferred
- Use Next.js Image component for optimized images

## Project Structure
```
/app          - Next.js App Router pages and API routes
/components   - React UI components
/hooks        - Custom React hooks
/lib          - Utilities and configurations
/config       - App configuration
/contracts    - Smart contract ABIs
/public       - Static assets
```

## Responsive Design
- Mobile-first approach
- Breakpoints: `sm:`, `md:`, `lg:`
- Hide on mobile: `hidden md:flex`
- Mobile navigation in `MobileNav.tsx`

## State Management
- React hooks (`useState`, `useEffect`, `useRef`)
- Custom hooks in `/hooks/`
- Web3 state via wagmi hooks

## Figma Integration Guidelines
- Replace Tailwind utilities with project tokens when applicable
- Reuse existing components from `/components/`
- Match the dark theme aesthetic
- Use existing color variables
- Validate against Figma screenshot for visual parity
