-- SprintMind AI - Documents Schema & Security Configuration

-- 1. Create the documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy: Project owners/members can view documents for their projects
CREATE POLICY "Allow owners to view project documents"
    ON public.documents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = documents.project_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow owners to insert project documents"
    ON public.documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = documents.project_id
            AND projects.owner_id = auth.uid()
        )
        AND uploader_id = auth.uid()
    );

CREATE POLICY "Allow owners to delete their documents"
    ON public.documents
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = documents.project_id
            AND projects.owner_id = auth.uid()
        )
    );
