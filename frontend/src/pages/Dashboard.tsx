import React from "react";
import { useAuthStore } from "../store/authStore";
import { isSupabaseConfigured } from "../config";
import { InfrastructureStatus } from "../components/InfrastructureStatus";

export const Dashboard: React.FC = () => {
  const { profile, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg text-zinc-50">S</div>
          <span className="font-bold text-lg tracking-tight">SprintMind AI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-md font-mono capitalize">
            {profile?.role || "user"}
          </span>
          {isSupabaseConfigured() ? (
            <button
              onClick={logout}
              className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-50 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <span className="text-xs px-2.5 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-md font-mono font-medium">
              Offline Mode
            </span>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        <div className="max-w-xl w-full border border-zinc-800 bg-zinc-900/30 rounded-xl p-8 text-center shadow-lg">
          <div className="w-20 h-20 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
            {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : "U"}
          </div>
          
          <h1 className="text-2xl font-extrabold text-zinc-50 mb-2">
            Welcome, {profile?.display_name || "User"}!
          </h1>
          <p className="text-sm text-zinc-400 mb-6 font-mono">
            {profile?.email}
          </p>

          <div className="border border-zinc-800 bg-zinc-950/50 rounded-lg p-6 text-left space-y-4">
            <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Active Authentication Session</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <span className="text-zinc-500">Profile ID:</span>
              <span className="col-span-2 text-zinc-300 font-mono select-all truncate">{profile?.id}</span>
              
              <span className="text-zinc-500">Workspace Role:</span>
              <span className="col-span-2 text-zinc-300 font-mono capitalize">{profile?.role}</span>
              
              <span className="text-zinc-500">Session Status:</span>
              <span className="col-span-2 text-emerald-400 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                {isSupabaseConfigured() ? "Active & Persistent" : "Local Development Mode (Mock)"}
              </span>
            </div>
          </div>
        </div>

        {/* Temporary Infrastructure Status Panel */}
        <InfrastructureStatus />
      </main>
    </div>
  );
};
