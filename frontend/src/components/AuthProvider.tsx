import React, { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../services/supabase";
import { isSupabaseConfigured } from "../config";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initialize, setSession, setUser, fetchUserProfile, loading } = useAuthStore();

  useEffect(() => {
    // Restore session on application load
    initialize();

    if (!isSupabaseConfigured()) {
      return;
    }

    // Set up auth state change listeners
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setSession(session);
          setUser(session.user);
          await fetchUserProfile(session.access_token);
        } else {
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize, setSession, setUser, fetchUserProfile]);

  // Loading screen during session restoration to avoid UI flickering
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-400 animate-pulse">Initializing security state...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
