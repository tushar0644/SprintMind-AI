import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";
import { config } from "../config";
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
        Coordinate Your AI Sprint Assistant
      </h2>
      <p className="text-xs text-white/70 leading-relaxed font-sans font-medium">
        Empower your development cycles with intelligent task mapping, automated backlog insights, and real-time sprint health metrics.
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

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { initialize } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Route fallback redirect destination
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validations
    if (!email || !password) {
      setLocalError("Please fill in all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    
    setLocalLoading(true);
    setLocalError(null);

    try {
      const res = await axios.post(`${config.apiUrl}/api/auth/login`, {
        email,
        password,
      });

      const { session } = res.data;
      if (session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (sessionError) {
          setLocalError(sessionError.message);
        } else {
          // Synchronize Zustand session and user state
          await initialize();
          navigate(from, { replace: true });
        }
      } else {
        setLocalError("Authentication failed. No active session returned.");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "An unexpected authorization error occurred.";
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
              Sign in to coordinate your AI sprint assistant
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

          <form onSubmit={handleSignIn} noValidate className="space-y-5 select-text">
            <div className="flex flex-col space-y-1.5 w-full">
              <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                disabled={localLoading}
                className="px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low"
                required
              />
            </div>

            <div className="flex flex-col space-y-1.5 w-full">
              <div className="flex justify-between items-center mb-0.5 select-none">
                <label className="text-xs font-semibold text-stitch-on-surface-variant">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-stitch-primary hover:text-stitch-primary-container font-semibold transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={localLoading}
                  className="px-3 py-2 pr-10 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low w-full"
                  required
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant/45 hover:text-stitch-on-surface transition-colors select-none focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
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
                  <span>Signing In...</span>
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-stitch-outline-variant/60 pt-6 select-none">
            <p className="text-xs text-stitch-on-surface-variant/80 font-medium">
              Don't have an account?{" "}
              <Link to="/signup" className="text-stitch-primary hover:text-stitch-primary-container font-semibold transition-colors">
                Sign Up
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
