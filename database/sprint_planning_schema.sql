-- v2.4 AI Sprint Planning
-- Adds the sprints table and the columns tasks need to be scheduled into
-- sprints while respecting dependencies (depends_on) and capacity.
-- Not yet applied to the connected Supabase project; the backend falls
-- back to an in-memory store when these are absent (see app/sprints/repository.py).

CREATE TABLE IF NOT EXISTS sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    sprint_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    total_points INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, sprint_number)
);

CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depends_on JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
