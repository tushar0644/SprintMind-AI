import { create } from "zustand";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import axios from "axios";
import { config } from "../config";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  
  initialize: () => Promise<void>;
  fetchUserProfile: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        set({ session, user: session.user });
        await get().fetchUserProfile(session.access_token);
      } else {
        set({ session: null, user: null, profile: null });
      }
    } catch (err: any) {
      console.error("Initialization auth error:", err);
      set({ error: err.message || "Failed to initialize session" });
    } finally {
      set({ loading: false });
    }
  },

  fetchUserProfile: async (token: string) => {
    try {
      const res = await axios.get<UserProfile>(`${config.apiUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      set({ profile: res.data, error: null });
    } catch (err: any) {
      console.error("Error fetching database profile:", err);
      set({ error: "Failed to synchronize user profile metadata with server" });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null, error: null });
    } catch (err: any) {
      set({ error: err.message || "Failed to sign out" });
    } finally {
      set({ loading: false });
    }
  },
}));
export type { AuthState };
