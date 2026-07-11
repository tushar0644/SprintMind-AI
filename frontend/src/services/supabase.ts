import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config, isSupabaseConfigured } from "../config";

/**
 * Creates a safe fallback client using a Proxy.
 * This client intercepts property accesses and returns safe mocks that prevent runtime crashes.
 */
const createFallbackClient = (): SupabaseClient => {
  console.warn(
    "[Infrastructure]\nSupabase configuration missing.\nApplication running in Local Development Mode."
  );

  const authMock = {
    onAuthStateChange: (_callback?: any) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              // No-op
            },
          },
        },
        error: null,
      };
    },
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: new Error("Supabase is not configured in this environment."),
    }),
    signUp: async () => ({
      data: { user: null, session: null },
      error: new Error("Supabase is not configured in this environment."),
    }),
  };

  const handler: ProxyHandler<any> = {
    get(_target, prop: string) {
      if (prop === "auth") {
        return authMock;
      }
      if (prop === "from") {
        return () => ({
          select: () => Promise.resolve({ data: [], error: null }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => Promise.resolve({ data: null, error: null }),
          delete: () => Promise.resolve({ data: null, error: null }),
        });
      }
      
      return (..._args: any[]) => {
        console.warn(`[Supabase Fallback] Called method "${prop}" which is unavailable in local fallback mode.`);
        return Promise.resolve({ data: null, error: new Error("Supabase is not configured.") });
      };
    },
  };

  return new Proxy({}, handler) as unknown as SupabaseClient;
};

// Instantiate the Supabase Client SDK or a safe fallback
export const supabase = isSupabaseConfigured()
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : createFallbackClient();

/**
 * Verifies that the Supabase client settings are correctly configured in frontend.
 * Confirms formatting and placeholder checks without executing database operations.
 */
export const verifySupabaseConnection = (): boolean => {
  return isSupabaseConfigured();
};
