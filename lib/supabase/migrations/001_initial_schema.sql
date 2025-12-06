-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    email TEXT,
    wallet_address TEXT,
    username TEXT,
    avatar_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb
);

-- History table (main activity log)
CREATE TABLE IF NOT EXISTS public.history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('swap', 'deploy', 'audit', 'generate', 'token', 'transfer')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    tx_hash TEXT,
    chain_id INTEGER,
    data JSONB DEFAULT '{}'::jsonb
);

-- Contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    source_code TEXT NOT NULL,
    compiler_version TEXT,
    deployed_address TEXT,
    chain_id INTEGER,
    abi JSONB,
    bytecode TEXT,
    audit_id UUID
);

-- Audits table
CREATE TABLE IF NOT EXISTS public.audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    contract_address TEXT,
    chain_id INTEGER,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    vulnerabilities JSONB DEFAULT '[]'::jsonb,
    recommendations TEXT,
    full_report TEXT
);

-- Add foreign key from contracts to audits
ALTER TABLE public.contracts 
ADD CONSTRAINT fk_contracts_audit 
FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE SET NULL;

-- Tokens table
CREATE TABLE IF NOT EXISTS public.tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimals INTEGER DEFAULT 18,
    total_supply TEXT NOT NULL,
    contract_address TEXT,
    chain_id INTEGER,
    logo_url TEXT,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL
);

-- Swaps table
CREATE TABLE IF NOT EXISTS public.swaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    history_id UUID REFERENCES public.history(id) ON DELETE SET NULL,
    from_token TEXT NOT NULL,
    to_token TEXT NOT NULL,
    from_amount TEXT NOT NULL,
    to_amount TEXT NOT NULL,
    from_token_address TEXT,
    to_token_address TEXT,
    chain_id INTEGER,
    dex TEXT,
    tx_hash TEXT,
    price_impact DECIMAL(10, 4),
    gas_used TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_history_user_id ON public.history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON public.history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_type ON public.history(type);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON public.audits(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON public.tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_swaps_user_id ON public.swaps(user_id);
CREATE INDEX IF NOT EXISTS idx_swaps_history_id ON public.swaps(history_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- History: Users can only see their own history
CREATE POLICY "Users can view own history" ON public.history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON public.history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own history" ON public.history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own history" ON public.history
    FOR DELETE USING (auth.uid() = user_id);

-- Contracts: Users can only see their own contracts
CREATE POLICY "Users can view own contracts" ON public.contracts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts" ON public.contracts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts" ON public.contracts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts" ON public.contracts
    FOR DELETE USING (auth.uid() = user_id);

-- Audits: Users can only see their own audits
CREATE POLICY "Users can view own audits" ON public.audits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audits" ON public.audits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audits" ON public.audits
    FOR UPDATE USING (auth.uid() = user_id);

-- Tokens: Users can only see their own tokens
CREATE POLICY "Users can view own tokens" ON public.tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON public.tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Swaps: Users can only see their own swaps
CREATE POLICY "Users can view own swaps" ON public.swaps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own swaps" ON public.swaps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();