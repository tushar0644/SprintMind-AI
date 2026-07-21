-- v2.5 AI Timeline & Resource Estimation
-- Adds project_estimations table for persisting realistic delivery forecasts,
-- velocity metrics, confidence scores, and calculated project end dates.

CREATE TABLE IF NOT EXISTS project_estimations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    estimated_start_date TIMESTAMPTZ NOT NULL,
    estimated_end_date TIMESTAMPTZ NOT NULL,
    estimated_duration_days INTEGER NOT NULL,
    average_velocity NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    confidence NUMERIC(5, 2) NOT NULL DEFAULT 0.85,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_estimations_project_id ON project_estimations(project_id);
