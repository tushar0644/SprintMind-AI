import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { isSupabaseConfigured } from "../config";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { session, profile, loading } = useAuthStore();
  const location = useLocation();

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

  // Bypass route protection if running in Local Development Mode without Supabase
  if (!isSupabaseConfigured()) {
    return <>{children}</>;
  }

  // Redirect to login if user is not authenticated
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle Role-based check if allowedRoles are specified
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 p-6">
        <div className="max-w-md w-full border border-red-500/20 bg-red-500/5 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-50 mb-2">Access Forbidden</h1>
          <p className="text-sm text-zinc-400 mb-6">
            You do not possess the required privileges to view this page. Contact your project lead for access.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-50 rounded-lg text-sm font-medium transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
