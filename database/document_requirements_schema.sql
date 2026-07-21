-- SprintMind AI - Document Requirements Schema
-- This table stores AI-extracted structured requirements for documents.

CREATE TABLE IF NOT EXISTS public.document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE CASCADE,
    functional_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    non_functional_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    business_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
    dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage requirements of their documents
CREATE POLICY "Allow users to manage requirements of their documents"
    ON public.document_requirements
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_requirements.document_id
        )
    );
