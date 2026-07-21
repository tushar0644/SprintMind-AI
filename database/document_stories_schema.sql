-- SprintMind AI - Document Epics & Stories Schema
-- Creates tables to persist AI-generated epics and nested user stories.

-- 1. Create document_epics table
CREATE TABLE IF NOT EXISTS public.document_epics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on epics
ALTER TABLE public.document_epics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage epics of their documents
CREATE POLICY "Allow users to manage epics of their documents"
    ON public.document_epics
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_epics.document_id
        )
    );


-- 2. Create document_stories table
CREATE TABLE IF NOT EXISTS public.document_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id UUID NOT NULL REFERENCES public.document_epics(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
    story_points INTEGER NOT NULL DEFAULT 1 CHECK (story_points >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on stories
ALTER TABLE public.document_stories ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage stories of their documents
CREATE POLICY "Allow users to manage stories of their documents"
    ON public.document_stories
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_stories.document_id
        )
    );
