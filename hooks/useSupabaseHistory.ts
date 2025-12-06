'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { HistoryItem, InsertHistory, Json } from '@/lib/supabase/types';
import { useAuth } from './useAuth';

export interface HistoryItemData extends Record<string, Json | undefined> {
    contractCode?: string;
    contractName?: string;
    compilerVersion?: string;
    auditScore?: number;
    vulnerabilities?: Array<{
        severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
        description: string;
        location?: string;
    }>;
    fromToken?: string;
    toToken?: string;
    fromAmount?: string;
    toAmount?: string;
    tokenName?: string;
    tokenSymbol?: string;
    tokenAddress?: string;
    totalSupply?: string;
    contractAddress?: string;
}

export interface CreateHistoryItem {
    type: 'swap' | 'deploy' | 'audit' | 'generate' | 'token' | 'transfer';
    title: string;
    description?: string;
    status?: 'pending' | 'success' | 'failed';
    txHash?: string;
    chainId?: number;
    data?: HistoryItemData;
}

export function useSupabaseHistory() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { user, isAuthenticated } = useAuth();
    const supabase = getSupabaseClient();

    // Fetch history from Supabase
    const fetchHistory = useCallback(async () => {
        if (!user) {
            setHistory([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await (supabase
            .from('history') as any)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (fetchError) {
            console.error('Error fetching history:', fetchError);
            setError(fetchError.message);
            setLoading(false);
            return;
        }

        setHistory(data as HistoryItem[]);
        setLoading(false);
    }, [user, supabase]);

    // Load history on mount and when user changes
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Subscribe to realtime updates
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('history_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'history',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setHistory(prev => [payload.new as HistoryItem, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setHistory(prev =>
                            prev.map(item =>
                                item.id === payload.new.id ? (payload.new as HistoryItem) : item
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setHistory(prev =>
                            prev.filter(item => item.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, supabase]);

    // Add new history item
    const addHistoryItem = async (item: CreateHistoryItem): Promise<HistoryItem | null> => {
        if (!user) {
            console.error('Cannot add history item: user not authenticated');
            return null;
        }

        const insertData: InsertHistory = {
            user_id: user.id,
            type: item.type,
            title: item.title,
            description: item.description || null,
            status: item.status || 'success',
            tx_hash: item.txHash || null,
            chain_id: item.chainId || null,
            data: (item.data as Json) || null,
        };

        const { data, error: insertError } = await (supabase
            .from('history') as any)
            .insert(insertData)
            .select()
            .single();

        if (insertError) {
            console.error('Error adding history item:', insertError);
            setError(insertError.message);
            return null;
        }

        return data as HistoryItem;
    };

    // Update history item
    const updateHistoryItem = async (
        id: string,
        updates: Partial<CreateHistoryItem>
    ): Promise<HistoryItem | null> => {
        if (!user) return null;

        const updateData: any = {};
        if (updates.title) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.status) updateData.status = updates.status;
        if (updates.txHash) updateData.tx_hash = updates.txHash;
        if (updates.chainId) updateData.chain_id = updates.chainId;
        if (updates.data) updateData.data = updates.data;

        const { data, error: updateError } = await (supabase
            .from('history') as any)
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating history item:', updateError);
            setError(updateError.message);
            return null;
        }

        return data as HistoryItem;
    };

    // Delete history item
    const deleteHistoryItem = async (id: string): Promise<boolean> => {
        if (!user) return false;

        const { error: deleteError } = await (supabase
            .from('history') as any)
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('Error deleting history item:', deleteError);
            setError(deleteError.message);
            return false;
        }

        return true;
    };

    // Clear all history
    const clearHistory = async (): Promise<boolean> => {
        if (!user) return false;

        const { error: deleteError } = await (supabase
            .from('history') as any)
            .delete()
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('Error clearing history:', deleteError);
            setError(deleteError.message);
            return false;
        }

        setHistory([]);
        return true;
    };

    // Get history by type
    const getHistoryByType = (type: CreateHistoryItem['type']): HistoryItem[] => {
        return history.filter(item => item.type === type);
    };

    // Get recent history
    const getRecentHistory = (limit: number = 10): HistoryItem[] => {
        return history.slice(0, limit);
    };

    return {
        history,
        loading,
        error,
        isAuthenticated,
        addHistoryItem,
        updateHistoryItem,
        deleteHistoryItem,
        clearHistory,
        refreshHistory: fetchHistory,
        getHistoryByType,
        getRecentHistory,
    };
}