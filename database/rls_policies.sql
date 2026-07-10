-- SprintMind AI - Supabase PostgreSQL Schema & Security Configurations
-- This script outlines the user profiles table, the auto-profile trigger, and Row-Level Security (RLS) policies.

-- 1. Create User Profiles Table
-- This table maps to the primary auth.users table managed by Supabase Auth.
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'developer' CHECK (role IN ('admin', 'developer', 'project_manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row-Level Security (RLS) on User Profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS Policies for user_profiles
-- Allow users to view any user profile in their workspace (or all profiles in this MVP setup)
CREATE POLICY "Allow public read access to user profiles" 
    ON public.user_profiles 
    FOR SELECT 
    USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Allow users to update their own profile" 
    ON public.user_profiles 
    FOR UPDATE 
    USING (auth.uid() = id);

-- 3. Automatic User Profile Creation Trigger
-- This function is executed automatically whenever a new signup completes in auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, display_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'developer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger function to auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();
