-- SprintMind AI - Projects Schema & Security Configurations
-- Creates the projects table and configures Row-Level Security (RLS) policies.

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT project_owner_name_unique UNIQUE (owner_id, name)
);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Define RLS Policies for projects
CREATE POLICY "Allow owners to select their own projects"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "Allow owners to insert their own projects"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow owners to update their own projects"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow owners to delete their own projects"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);
