export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    email: string | null
                    wallet_address: string | null
                    username: string | null
                    avatar_url: string | null
                    settings: Json | null
                }
                Insert: {
                    id: string
                    created_at?: string
                    updated_at?: string
                    email?: string | null
                    wallet_address?: string | null
                    username?: string | null
                    avatar_url?: string | null
                    settings?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    email?: string | null
                    wallet_address?: string | null
                    username?: string | null
                    avatar_url?: string | null
                    settings?: Json | null
                }
            }
            history: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    type: 'swap' | 'deploy' | 'audit' | 'generate' | 'token' | 'transfer'
                    title: string
                    description: string | null
                    status: 'pending' | 'success' | 'failed'
                    tx_hash: string | null
                    chain_id: number | null
                    data: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    type: 'swap' | 'deploy' | 'audit' | 'generate' | 'token' | 'transfer'
                    title: string
                    description?: string | null
                    status?: 'pending' | 'success' | 'failed'
                    tx_hash?: string | null
                    chain_id?: number | null
                    data?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    type?: 'swap' | 'deploy' | 'audit' | 'generate' | 'token' | 'transfer'
                    title?: string
                    description?: string | null
                    status?: 'pending' | 'success' | 'failed'
                    tx_hash?: string | null
                    chain_id?: number | null
                    data?: Json | null
                }
            }
            contracts: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    name: string
                    description: string | null
                    source_code: string
                    compiler_version: string | null
                    deployed_address: string | null
                    chain_id: number | null
                    abi: Json | null
                    bytecode: string | null
                    audit_id: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    name: string
                    description?: string | null
                    source_code: string
                    compiler_version?: string | null
                    deployed_address?: string | null
                    chain_id?: number | null
                    abi?: Json | null
                    bytecode?: string | null
                    audit_id?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    name?: string
                    description?: string | null
                    source_code?: string
                    compiler_version?: string | null
                    deployed_address?: string | null
                    chain_id?: number | null
                    abi?: Json | null
                    bytecode?: string | null
                    audit_id?: string | null
                }
            }
            audits: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    contract_id: string | null
                    contract_address: string | null
                    chain_id: number | null
                    score: number
                    vulnerabilities: Json | null
                    recommendations: string | null
                    full_report: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    contract_id?: string | null
                    contract_address?: string | null
                    chain_id?: number | null
                    score: number
                    vulnerabilities?: Json | null
                    recommendations?: string | null
                    full_report?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    contract_id?: string | null
                    contract_address?: string | null
                    chain_id?: number | null
                    score?: number
                    vulnerabilities?: Json | null
                    recommendations?: string | null
                    full_report?: string | null
                }
            }
            tokens: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    name: string
                    symbol: string
                    decimals: number
                    total_supply: string
                    contract_address: string | null
                    chain_id: number | null
                    logo_url: string | null
                    contract_id: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    name: string
                    symbol: string
                    decimals?: number
                    total_supply: string
                    contract_address?: string | null
                    chain_id?: number | null
                    logo_url?: string | null
                    contract_id?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    name?: string
                    symbol?: string
                    decimals?: number
                    total_supply?: string
                    contract_address?: string | null
                    chain_id?: number | null
                    logo_url?: string | null
                    contract_id?: string | null
                }
            }
            swaps: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    history_id: string | null
                    from_token: string
                    to_token: string
                    from_amount: string
                    to_amount: string
                    from_token_address: string | null
                    to_token_address: string | null
                    chain_id: number | null
                    dex: string | null
                    tx_hash: string | null
                    price_impact: number | null
                    gas_used: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    history_id?: string | null
                    from_token: string
                    to_token: string
                    from_amount: string
                    to_amount: string
                    from_token_address?: string | null
                    to_token_address?: string | null
                    chain_id?: number | null
                    dex?: string | null
                    tx_hash?: string | null
                    price_impact?: number | null
                    gas_used?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    history_id?: string | null
                    from_token?: string
                    to_token?: string
                    from_amount?: string
                    to_amount?: string
                    from_token_address?: string | null
                    to_token_address?: string | null
                    chain_id?: number | null
                    dex?: string | null
                    tx_hash?: string | null
                    price_impact?: number | null
                    gas_used?: string | null
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            history_type: 'swap' | 'deploy' | 'audit' | 'generate' | 'token' | 'transfer'
            history_status: 'pending' | 'success' | 'failed'
        }
    }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type HistoryItem = Database['public']['Tables']['history']['Row']
export type Contract = Database['public']['Tables']['contracts']['Row']
export type Audit = Database['public']['Tables']['audits']['Row']
export type Token = Database['public']['Tables']['tokens']['Row']
export type Swap = Database['public']['Tables']['swaps']['Row']

export type InsertProfile = Database['public']['Tables']['profiles']['Insert']
export type InsertHistory = Database['public']['Tables']['history']['Insert']
export type InsertContract = Database['public']['Tables']['contracts']['Insert']
export type InsertAudit = Database['public']['Tables']['audits']['Insert']
export type InsertToken = Database['public']['Tables']['tokens']['Insert']
export type InsertSwap = Database['public']['Tables']['swaps']['Insert']