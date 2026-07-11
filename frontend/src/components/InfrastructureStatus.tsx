import React, { useEffect, useState } from "react";
import axios from "axios";
import { config, isSupabaseConfigured, isGeminiConfigured } from "../config";

interface HealthCheckResponse {
  status: string;
  supabase_configured?: boolean;
  gemini_configured?: boolean;
}

export const InfrastructureStatus: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [backendSupabase, setBackendSupabase] = useState<boolean | null>(null);
  const [backendGemini, setBackendGemini] = useState<boolean | null>(null);

  const checkStatus = async () => {
    try {
      const res = await axios.get<HealthCheckResponse>(`${config.apiUrl}/health`, {
        timeout: 2500,
      });
      if (res.status === 200 && res.data?.status === "healthy") {
        setBackendStatus("connected");
        setBackendSupabase(res.data.supabase_configured ?? null);
        setBackendGemini(res.data.gemini_configured ?? null);
      } else {
        setBackendStatus("disconnected");
      }
    } catch (err) {
      setBackendStatus("disconnected");
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const clientSupabaseOk = isSupabaseConfigured();
  const clientGeminiOk = isGeminiConfigured();

  const supabaseOk = clientSupabaseOk && (backendStatus !== "connected" || backendSupabase !== false);
  const geminiOk = backendStatus === "connected" ? !!backendGemini : clientGeminiOk;

  return (
    <div className="border border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-xl p-6 text-left shadow-lg space-y-4 max-w-md w-full mx-auto mt-6">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
        <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
          Infrastructure Configuration Status
        </h3>
        <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            backendStatus === "connected" ? "bg-emerald-400" : backendStatus === "disconnected" ? "bg-amber-400" : "bg-zinc-400"
          }`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            backendStatus === "connected" ? "bg-emerald-500" : backendStatus === "disconnected" ? "bg-amber-500" : "bg-zinc-500"
          }`}></span>
        </span>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {/* Backend Connected */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">FastAPI Backend:</span>
          {backendStatus === "connected" ? (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              ✓ Backend Connected
            </span>
          ) : backendStatus === "disconnected" ? (
            <span className="text-amber-500 flex items-center gap-1 font-medium">
              ⚠ Backend Disconnected
            </span>
          ) : (
            <span className="text-zinc-400 flex items-center gap-1 font-medium animate-pulse">
              ● Checking Connection...
            </span>
          )}
        </div>

        {/* Supabase Configured */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Supabase Integration:</span>
          {supabaseOk ? (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              ✓ Supabase Configured
            </span>
          ) : (
            <span className="text-amber-500 flex items-center gap-1 font-medium">
              ⚠ Supabase Not Configured
            </span>
          )}
        </div>

        {/* Gemini Configured */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Gemini LLM Engine:</span>
          {geminiOk ? (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              ✓ Gemini Configured
            </span>
          ) : (
            <span className="text-amber-500 flex items-center gap-1 font-medium">
              ⚠ Gemini Not Configured
            </span>
          )}
        </div>
      </div>
      
      {(!supabaseOk || !geminiOk || backendStatus === "disconnected") && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] leading-relaxed">
          Application is running in <strong className="underline">Local Development Mode</strong>. Bypassing service calls. Fill in environment credentials to establish active integrations.
        </div>
      )}
    </div>
  );
};
