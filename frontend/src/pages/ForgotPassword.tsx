import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setLocalError("Please enter your email address.");
      return;
    }

    setLocalLoading(true);
    setLocalError(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setLocalError(error.message);
      } else {
        setSuccessMsg("Recovery email sent successfully. Check your inbox for instructions.");
      }
    } catch (err: any) {
      setLocalError("An unexpected error occurred.");
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 p-6">
      <div className="max-w-md w-full border border-zinc-800 bg-zinc-900/50 rounded-xl p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-zinc-50 tracking-tight">SprintMind AI</h1>
          <p className="text-sm text-zinc-400 mt-2">Reset your account password</p>
        </div>

        {localError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm flex gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{localError}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm flex gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              disabled={localLoading}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={localLoading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-zinc-50 text-sm font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 active:bg-indigo-700 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {localLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-50 border-t-transparent rounded-full animate-spin"></div>
                <span>Sending email...</span>
              </>
            ) : (
              "Send Recovery Email"
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-zinc-800/80 pt-6">
          <p className="text-xs text-zinc-400">
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Return to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
