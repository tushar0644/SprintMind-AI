-- SprintMind AI - AI Persistence & Jobs Schema
-- Creates tables for AI conversations, messages, logs, and background jobs.

-- 1. AI Conversations Table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(100) DEFAULT 'New Chat' NOT NULL,
    tool_type VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Conversations RLS Policies
CREATE POLICY "Allow owners to select their own conversations"
    ON public.ai_conversations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Allow owners to insert their own conversations"
    ON public.ai_conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners to update their own conversations"
    ON public.ai_conversations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners to delete their own conversations"
    ON public.ai_conversations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 2. AI Messages Table
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Messages RLS Policies
CREATE POLICY "Allow select on messages for owned conversations"
    ON public.ai_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE public.ai_conversations.id = public.ai_messages.conversation_id
            AND public.ai_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow insert on messages for owned conversations"
    ON public.ai_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE public.ai_conversations.id = public.ai_messages.conversation_id
            AND public.ai_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow update on messages for owned conversations"
    ON public.ai_messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE public.ai_conversations.id = public.ai_messages.conversation_id
            AND public.ai_conversations.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE public.ai_conversations.id = public.ai_messages.conversation_id
            AND public.ai_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow delete on messages for owned conversations"
    ON public.ai_messages
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE public.ai_conversations.id = public.ai_messages.conversation_id
            AND public.ai_conversations.user_id = auth.uid()
        )
    );


-- 3. AI Logs Table
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    feature VARCHAR(50) NOT NULL,
    latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
    token_usage INTEGER NOT NULL CHECK (token_usage >= 0),
    error_occurred BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- Logs RLS Policies
CREATE POLICY "Allow owners to select their own logs"
    ON public.ai_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Allow owners to insert their own logs"
    ON public.ai_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners to update their own logs"
    ON public.ai_logs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners to delete their own logs"
    ON public.ai_logs
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 4. Background Jobs Table
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    payload JSONB,
    result JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Jobs RLS Policies
CREATE POLICY "Allow owners to select their own jobs"
    ON public.background_jobs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Allow owners to insert their own jobs"
    ON public.background_jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners to update their own jobs"
    ON public.background_jobs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owners to delete their own jobs"
    ON public.background_jobs
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project ON public.ai_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tool ON public.ai_conversations(tool_type);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON public.ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_user ON public.background_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_project ON public.background_jobs(project_id);
