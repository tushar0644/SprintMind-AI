-- SprintMind AI - Projects CRUD Table Modifications
-- Alters projects table to support soft delete and status field validation.

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
