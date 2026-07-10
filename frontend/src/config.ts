// SprintMind AI Frontend - Client Configurations Loader
export const config = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || "",
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "",
  apiUrl: (import.meta.env.VITE_API_URL as string) || "http://localhost:8000",
  environment: (import.meta.env.MODE as string) || "development",
};

// Validate that required keys are present in development/production
if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.warn(
    "Warning: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY configurations. Verification operations will fail."
  );
}
