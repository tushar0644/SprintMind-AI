-- v2.7 AI Project Health Dashboard Schema
-- Adds project_dashboard_snapshots table for storing executive health score snapshots,
-- velocity metrics, completion percentages, risk counts, and status trends over time.

CREATE TABLE IF NOT EXISTS project_dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    health_score NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
    risk_count INTEGER NOT NULL DEFAULT 0,
    velocity NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    completion NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_project_id ON project_dashboard_snapshots(project_id);
