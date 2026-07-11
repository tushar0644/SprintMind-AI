import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../services/supabase";
import { config, isSupabaseConfigured } from "../config";

export const Verify: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSession, setUser } = useAuthStore();

  const initialEmail = location.state?.email || "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resending validation code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) {
      setLocalError("Please enter both your email and the verification code.");
      return;
    }
    if (otp.length < 6) {
      setLocalError("Verification code must be at least 6 characters.");
      return;
    }

    setLocalLoading(true);
    setLocalError(null);
    setSuccessMsg(null);

    try {
      if (isSupabaseConfigured()) {
        const res = await axios.post(`${config.apiUrl}/api/auth/verify-otp`, {
          email,
          token: otp,
          type: "signup",
        });

        const { session, user } = res.data;
        
        // Auto-login: set session in store and client SDK
        setSession(session);
        setUser(user);
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      setSuccessMsg("Email successfully verified! Redirecting to dashboard...");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Invalid code or verification failed.";
      setLocalError(errMsg);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setLocalError("Please enter your email address to request a new code.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    setLocalLoading(true);
    setLocalError(null);
    setSuccessMsg(null);

    try {
      await axios.post(`${config.apiUrl}/api/auth/resend-verification`, {
        email,
      });
      setSuccessMsg("Verification code successfully resent! Check your email inbox.");
      setResendCooldown(60);
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to resend verification link.";
      setLocalError(errMsg);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 p-6">
      <div className="max-w-md w-full border border-zinc-800 bg-zinc-900/50 rounded-xl p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-zinc-50 tracking-tight">SprintMind AI</h1>
          <p className="text-sm text-zinc-400 mt-2">Verify your workspace email address</p>
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

        <form onSubmit={handleVerifyOtp} noValidate className="space-y-4">
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

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">Verification Code (OTP)</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              disabled={localLoading}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-50 text-center tracking-widest font-mono text-lg"
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
                <span>Verifying...</span>
              </>
            ) : (
              "Verify Email"
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4 text-center border-t border-zinc-800/80 pt-6">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={localLoading || resendCooldown > 0}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors disabled:text-zinc-500 disabled:pointer-events-none"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Verification Code"}
          </button>
          
          <p className="text-xs text-zinc-400">
            <Link to="/login" className="text-zinc-500 hover:text-zinc-300 font-medium transition-colors">
              Return to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
