import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../services/supabase";
import { config, isSupabaseConfigured } from "../config";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

const AuthHeroPanel: React.FC = () => (
  <div className="hidden lg:flex w-1/2 bg-stitch-primary text-white flex-col justify-between p-12 relative overflow-hidden select-none">
    {/* Decorative blur elements */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-stitch-secondary/30 to-transparent blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
    <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-stitch-primary-container/20 to-transparent blur-3xl rounded-full -translate-x-12 translate-y-12 animate-pulse"></div>

    {/* Brand Logo Header */}
    <div className="flex items-center gap-2.5 relative z-10">
      <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
        <span className="font-extrabold text-sm tracking-tight text-white font-sans">S</span>
      </div>
      <span className="font-extrabold text-base tracking-tight text-white font-sans">SprintMind AI</span>
    </div>

    {/* Big Hero Pitch */}
    <div className="relative z-10 max-w-[448px] my-auto space-y-6">
      <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-white font-sans">
        Verify Your Email Address
      </h2>
      <p className="text-xs text-white/70 leading-relaxed font-sans font-medium">
        Enter the 6-digit verification code sent to your inbox to authenticate your account and activate your AI-assisted workspace.
      </p>

      {/* Decorative Interactive Graphic mockup */}
      <div className="border border-white/10 bg-white/5 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden mt-8 select-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
          </div>
          <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase font-sans">Sprint Health</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-white/80 mb-1">
              <span>Backlog Tasks Completed</span>
              <span className="font-extrabold">64%</span>
            </div>
            <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div className="w-[64%] h-full bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/70 italic">
            <svg className="w-3.5 h-3.5 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>AI correlation assistant active</span>
          </div>
        </div>
      </div>
    </div>

    {/* Footnote branding */}
    <div className="relative z-10 text-[10px] text-white/40 font-semibold font-sans uppercase tracking-wider">
      SprintMind AI v1.0.0 &copy; 2026
    </div>
  </div>
);

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
    <div className="min-h-screen flex bg-stitch-background select-none">
      {/* Left panel branding illustration */}
      <AuthHeroPanel />

      {/* Right panel form content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-stitch-background min-h-screen">
        <Card className="max-w-md w-full border border-stitch-outline-variant/60 bg-white p-8 shadow-xl rounded-2xl select-none">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface font-sans">SprintMind AI</h1>
            <p className="text-xs text-stitch-on-surface-variant mt-2 font-medium">
              Verify your workspace email address
            </p>
          </div>

          {localError && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/15 text-red-600 rounded-xl text-xs font-semibold flex gap-2.5 animate-fade-in shadow-sm select-text">
              <svg className="w-4.5 h-4.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{localError}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/15 text-emerald-600 rounded-xl text-xs font-semibold flex gap-2.5 animate-fade-in shadow-sm select-text">
              <svg className="w-4.5 h-4.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} noValidate className="space-y-5 select-text">
            <div className="flex flex-col space-y-1.5 w-full">
              <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                disabled={localLoading}
                className="px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low"
                required
              />
            </div>

            <div className="flex flex-col space-y-1.5 w-full">
              <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">Verification Code (OTP)</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                disabled={localLoading}
                className="px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low text-center tracking-widest font-mono text-lg font-bold"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={localLoading}
              variant="primary"
              className="w-full flex items-center justify-center gap-2 text-xs"
            >
              {localLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-4 text-center border-t border-stitch-outline-variant/60 pt-6 select-none">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={localLoading || resendCooldown > 0}
              className="text-xs text-stitch-primary hover:text-stitch-primary-container font-semibold transition-colors disabled:text-stitch-on-surface-variant/40 disabled:pointer-events-none"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Verification Code"}
            </button>
            
            <p className="text-xs text-stitch-on-surface-variant/80 font-medium">
              <Link to="/login" className="text-stitch-on-surface-variant/50 hover:text-stitch-on-surface transition-colors">
                Return to Login
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
