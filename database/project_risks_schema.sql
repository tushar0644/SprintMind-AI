-- v2.6 AI Risk Analysis Schema
-- Adds project_risks table for storing detected project risks, severities,
-- categories, affected tasks/sprints, and actionable recommendations.

CREATE TABLE IF NOT EXISTS project_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT NOT NULL CHECK (category IN ('dependency', 'workload', 'schedule')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_sprint INTEGER,
    affected_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendation TEXT NOT NULL,
    confidence NUMERIC(5, 2) NOT NULL DEFAULT 0.85,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_risks_project_id ON project_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_severity ON project_risks(severity);
