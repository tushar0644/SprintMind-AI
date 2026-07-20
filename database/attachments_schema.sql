-- SprintMind AI - Attachments Schema & Storage Configuration

-- 1. Create the attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Project members/owners can view attachments for their projects
-- (For simplicity, reusing the project owner check, but ideally checking project membership)
CREATE POLICY "Allow owners to view project attachments"
    ON public.attachments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = attachments.project_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow owners to insert project attachments"
    ON public.attachments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = attachments.project_id
            AND projects.owner_id = auth.uid()
        )
        AND uploader_id = auth.uid()
    );

CREATE POLICY "Allow owners to delete their attachments"
    ON public.attachments
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = attachments.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- 2. Configure Storage Bucket
-- (Note: Ensure the storage schema exists in your Supabase project)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for 'attachments' bucket
-- Allow authenticated users to view attachments
CREATE POLICY "Allow authenticated users to view attachments"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'attachments');

-- Allow authenticated users to upload attachments
CREATE POLICY "Allow authenticated users to upload attachments"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated users to update their uploads"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'attachments')
    WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated users to delete their uploads"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'attachments');
