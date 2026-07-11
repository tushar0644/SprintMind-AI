# Database Design & Security

The database schema is hosted on Supabase PostgreSQL. This document outlines the schema tables, triggers, and Row-Level Security (RLS) rules established.

---

## 1. Schema Tables

### `public.user_profiles`
Stores metadata associated with authenticated platform users. Maps directly to Supabase central `auth.users` schema.

```sql
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'developer' CHECK (role IN ('admin', 'developer', 'project_manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

---

## 2. Profile Sync Trigger
An automated trigger synchronizes user creation from Supabase Auth (`auth.users`) to `public.user_profiles`.

```sql
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

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();
```

> [!CAUTION]
> For security hardening, direct execute access on `public.handle_new_user_signup()` is revoked from the public role:
> `REVOKE EXECUTE ON FUNCTION public.handle_new_user_signup() FROM PUBLIC;`

---

## 3. Row-Level Security (RLS) Policies
RLS is enabled on the `user_profiles` table to restrict public modification and only permit validated operations:

*   **Select Policy**:
    *   **Name**: `Allow public read access to user profiles`
    *   **Role Target**: `authenticated`
    *   **Condition**: `USING (true)`
*   **Update Policy**:
    *   **Name**: `Allow users to update their own profile`
    *   **Role Target**: `authenticated`
    *   **Condition**: `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`
