import React from "react";
import { useAuthStore } from "../store/authStore";
import { isSupabaseConfigured } from "../config";
import { InfrastructureStatus } from "../components/InfrastructureStatus";
import { ProjectLayout } from "../features/projects/components/ProjectLayout";

export const Dashboard: React.FC = () => {
  const { profile } = useAuthStore();

  return (
    <ProjectLayout>
      <div className="flex flex-col items-center justify-center p-6 space-y-6">
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
      </div>
    </ProjectLayout>
  );
};
