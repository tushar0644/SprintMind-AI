import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { isSupabaseConfigured } from "../../../config";

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export const ProjectLayout: React.FC<ProjectLayoutProps> = ({ children }) => {
  const { profile, logout } = useAuthStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-900 bg-[#0c0c0e] flex flex-col shrink-0">
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-zinc-900/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center font-bold text-md text-zinc-50 shadow-md shadow-indigo-500/10 select-none">
            S
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100 font-sans">SprintMind AI</span>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-4 space-y-1.5">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              location.pathname === "/dashboard"
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/15"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            <span>Dashboard</span>
          </Link>

          <Link
            to="/projects"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              location.pathname === "/projects"
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/15"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Projects</span>
          </Link>

          <Link
            to="/tasks"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              location.pathname === "/tasks"
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/15"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>Tasks</span>
          </Link>
        </nav>

        {/* User Workspace Info Footer */}
        <div className="p-4 border-t border-zinc-900/60">
          <div className="flex items-center gap-3 px-3.5 py-3 bg-[#09090b]/80 border border-zinc-900 rounded-xl mb-3 shadow-sm select-none">
            <div className="w-7.5 h-7.5 rounded-full bg-indigo-600/15 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/10">
              {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="truncate flex-1">
              <p className="text-[11px] font-semibold text-zinc-200 truncate">{profile?.display_name}</p>
              <p className="text-[9px] text-zinc-500 truncate mt-0.5">{profile?.email}</p>
            </div>
          </div>
          
          {isSupabaseConfigured() ? (
            <button
              onClick={logout}
              className="w-full py-2 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-900 hover:text-zinc-200 text-zinc-400 text-[10px] font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          ) : (
            <div className="text-center py-1.5 bg-yellow-500/5 border border-yellow-500/10 text-yellow-500/80 rounded-lg text-[9px] font-mono font-medium">
              Offline Mode
            </div>
          )}
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Header */}
        <header className="h-14 border-b border-zinc-900 bg-[#0c0c0e]/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0 select-none">
          <div>
            <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-sans">
              {location.pathname === "/dashboard"
                ? "Workspace Overview"
                : location.pathname === "/tasks"
                ? "Tasks"
                : "Projects Directory"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] px-2 py-0.5 bg-zinc-900 border border-zinc-900 text-zinc-400 rounded font-mono capitalize tracking-wider">
              {profile?.role || "user"}
            </span>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#09090b]">
          {children}
        </main>
      </div>
    </div>
  );
};
