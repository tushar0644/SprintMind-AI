-- SprintMind AI - Document Analysis Schema
-- This table stores AI-generated summaries and analysis for documents.

CREATE TABLE IF NOT EXISTS public.document_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Analyzing', 'Completed', 'Failed')),
    executive_summary TEXT,
    objectives JSONB,
    deliverables JSONB,
    timeline JSONB,
    risks JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.document_analysis ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage analysis of their documents
CREATE POLICY "Allow users to manage analysis of their documents"
    ON public.document_analysis
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_analysis.document_id
        )
    );
