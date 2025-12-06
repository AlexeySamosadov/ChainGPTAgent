import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Web3Provider } from '@/lib/web3/provider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChainGPT Web3 Copilot",
  description: "AI-powered Web3 Assistant on BNB Chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
