-- SprintMind AI - Portfolio Snapshots Schema Migration
-- Creates portfolio_snapshots table for storing executive portfolio health trends.

CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    total_projects INTEGER NOT NULL DEFAULT 0,
    average_health_score NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
    portfolio_status VARCHAR(50) NOT NULL DEFAULT 'healthy' CHECK (portfolio_status IN ('healthy', 'warning', 'critical')),
    total_risks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_owner_id ON public.portfolio_snapshots(owner_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_created_at ON public.portfolio_snapshots(created_at);

-- Enable RLS
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Define RLS Policy
CREATE POLICY "Allow owners to manage portfolio snapshots"
    ON public.portfolio_snapshots
    FOR ALL
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);
