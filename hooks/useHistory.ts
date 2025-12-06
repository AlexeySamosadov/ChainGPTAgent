import { useState, useEffect } from 'react';

export interface HistoryItem {
    id: string;
    type: 'deploy' | 'swap' | 'audit' | 'generate' | 'token';
    title: string;
    description: string;
    status: 'success' | 'pending' | 'failed';
    time: string; // ISO string or relative
    txHash?: string;
    timestamp: number;
    // Extended data for different types
    data?: {
        // For contract generation
        contractCode?: string;
        contractName?: string;
        compilerVersion?: string;
        // For audit
        auditScore?: number;
        vulnerabilities?: Array<{
            severity: 'low' | 'medium' | 'high' | 'critical';
            description: string;
        }>;
        contractAddress?: string;
        // For swap
        fromToken?: string;
        toToken?: string;
        fromAmount?: string;
        toAmount?: string;
        // For token creation
        tokenName?: string;
        tokenSymbol?: string;
        tokenAddress?: string;
        totalSupply?: string;
    };
}

const STORAGE_KEY = 'chaingpt_history_v1';

export function useHistory() {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        // Load from local storage on mount
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setHistory(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse history', e);
            }
        }
    }, []);

    const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'time' | 'timestamp'>) => {
        const newItem: HistoryItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString(), // Simple format for now
        };

        setHistory((prev) => {
            const updated = [newItem, ...prev];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    return {
        history,
        addHistoryItem,
        clearHistory
    };
}
