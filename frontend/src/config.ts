// SprintMind AI Frontend - Client Configurations Loader
export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
  environment: import.meta.env.MODE || "development",
};


// Validate that required keys are present in development/production
if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.warn(
    "Warning: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY configurations. Verification operations will fail."
  );
}

/**
 * Checks if Supabase client configuration variables are fully populated.
 * Confirms that values are present and not standard placeholder strings.
 */
export const isSupabaseConfigured = (): boolean => {
  try {
    const url = config.supabaseUrl;
    const key = config.supabaseAnonKey;
    
    return (
      Boolean(url) &&
      url.trim() !== "" &&
      !url.includes("your-supabase-url") &&
      !url.includes("your-project") &&
      Boolean(key) &&
      key.trim() !== "" &&
      !key.includes("your-supabase-anon-key") &&
      !key.includes("your-anon-key")
    );
  } catch (err) {
    console.error("Error evaluating Supabase configuration status:", err);
    return false;
  }
};

/**
 * Checks if the Gemini API/integration is configured for client-side routing.
 * Since the Gemini API key is stored server-side to prevent leakage, the client
 * can be configured using the VITE_GEMINI_CONFIGURED env var.
 */
export const isGeminiConfigured = (): boolean => {
  try {
    return (
      import.meta.env.VITE_GEMINI_CONFIGURED === "true" ||
      (Boolean(import.meta.env.VITE_GEMINI_API_KEY) && 
       import.meta.env.VITE_GEMINI_API_KEY !== "your-gemini-key")
    );
  } catch (err) {
    console.error("Error evaluating Gemini configuration status:", err);
    return false;
  }
};

