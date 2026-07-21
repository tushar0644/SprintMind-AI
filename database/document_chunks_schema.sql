-- SprintMind AI - Document Chunks Schema & Security Configuration

-- Create the document_chunks table
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    page INT NOT NULL DEFAULT 1,
    text TEXT NOT NULL,
    char_count INT NOT NULL,
    token_estimate INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Project owners/members can view document chunks for their projects
CREATE POLICY "Allow owners to view document chunks"
    ON public.document_chunks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            JOIN public.projects ON projects.id = documents.project_id
            WHERE documents.id = document_chunks.document_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow owners to insert document chunks"
    ON public.document_chunks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents
            JOIN public.projects ON projects.id = documents.project_id
            WHERE documents.id = document_chunks.document_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow owners to delete document chunks"
    ON public.document_chunks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            JOIN public.projects ON projects.id = documents.project_id
            WHERE documents.id = document_chunks.document_id
            AND projects.owner_id = auth.uid()
        )
    );
