-- SprintMind AI - Comments and Reactions Schema
-- Creates comments and comment_reactions tables with appropriate constraints, foreign keys, and RLS.

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT comment_user_emoji_unique UNIQUE (comment_id, user_id, emoji)
);

-- Enable Row-Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public.comments
CREATE POLICY "Allow authenticated users to read comments"
    ON public.comments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow users to insert their own comments"
    ON public.comments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authors, project owners, or admins to update comments"
    ON public.comments
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.projects p 
            JOIN public.tasks t ON t.project_id = p.id 
            WHERE t.id = task_id AND p.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

CREATE POLICY "Allow authors, project owners, or admins to delete comments"
    ON public.comments
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.projects p 
            JOIN public.tasks t ON t.project_id = p.id 
            WHERE t.id = task_id AND p.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- RLS Policies for public.comment_reactions
CREATE POLICY "Allow authenticated users to read reactions"
    ON public.comment_reactions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow users to insert their own reactions"
    ON public.comment_reactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own reactions"
    ON public.comment_reactions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
