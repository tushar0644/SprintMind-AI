-- SprintMind AI - Project Generation Schema Migration
-- Updates projects, project_epics, and tasks tables to enable automatic project mapping.

-- 1. Add generated_from_document_id unique column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS generated_from_document_id UUID UNIQUE;


-- 2. Create project_epics table (project-level epics mapping)
CREATE TABLE IF NOT EXISTS public.project_epics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.project_epics ENABLE ROW LEVEL SECURITY;

-- Allow project owners to manage epics
CREATE POLICY "Allow project owners to manage epics"
    ON public.project_epics
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_epics.project_id
            AND projects.owner_id = auth.uid()
        )
    );


-- 3. Add epic_id, story_points, and checklist columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS epic_id UUID REFERENCES public.project_epics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 1 CHECK (story_points >= 0),
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;
