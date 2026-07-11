import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { isSupabaseConfigured } from "../config";

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { session } = useAuthStore();

  // If Supabase is not configured, bypass login screens entirely
  if (!isSupabaseConfigured()) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to dashboard if session already exists
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
