import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { isSupabaseConfigured } from "../../../config";
import { Badge } from "../../../components/ui/Badge";

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export const ProjectLayout: React.FC<ProjectLayoutProps> = ({ children }) => {
  const { profile, logout } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navItems = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      to: "/projects",
      label: "Projects",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      to: "/tasks",
      label: "Tasks",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      to: "/settings",
      label: "Settings",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-stitch-background text-stitch-on-surface flex font-sans">
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-stitch-on-surface/20 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-stitch-outline-variant bg-white flex flex-col shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-stitch-outline-variant/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-stitch bg-stitch-primary hover:bg-stitch-primary-container transition-colors flex items-center justify-center font-bold text-md text-white shadow-sm shadow-stitch-primary/10 select-none">
              S
            </div>
            <span className="font-semibold text-sm tracking-tight text-stitch-on-surface">
              SprintMind AI
            </span>
          </div>
          {/* Close button for mobile sidebar */}
          <button
            className="md:hidden p-1 text-stitch-on-surface-variant hover:text-stitch-on-surface"
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-stitch text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-stitch-primary/10 text-stitch-primary text-indigo-600 border border-stitch-primary/15 shadow-sm"
                    : "text-stitch-on-surface-variant hover:bg-stitch-surface-container-low hover:text-stitch-on-surface"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Workspace Info Footer */}
        <div className="p-4 border-t border-stitch-outline-variant/60">
          <div className="flex items-center gap-3 px-3.5 py-3 bg-stitch-surface-container-low border border-stitch-outline-variant/40 rounded-stitch mb-3 shadow-sm select-none">
            <div className="w-8 h-8 rounded-full bg-stitch-primary/15 text-stitch-primary flex items-center justify-center font-bold text-xs shrink-0 border border-stitch-primary/10">
              {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="truncate flex-1">
              <p className="text-[11px] font-bold text-stitch-on-surface truncate">
                {profile?.display_name || "User"}
              </p>
              <p className="text-[9px] text-stitch-on-surface-variant/80 truncate mt-0.5">
                {profile?.email}
              </p>
            </div>
          </div>

          {isSupabaseConfigured() ? (
            <button
              onClick={logout}
              className="w-full py-2 bg-white hover:bg-stitch-surface-container border border-stitch-outline-variant hover:text-stitch-on-surface text-stitch-on-surface-variant text-[10px] font-bold rounded-stitch transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          ) : (
            <div className="text-center py-1.5 bg-amber-500/5 border border-amber-500/10 text-amber-600 rounded-stitch text-[9px] font-mono font-bold uppercase tracking-wider">
              Offline Mode
            </div>
          )}
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Header */}
        <header className="h-14 border-b border-stitch-outline-variant bg-white/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            {/* Hamburger button for mobile views */}
            <button
              className="md:hidden p-1 text-stitch-on-surface-variant hover:text-stitch-on-surface rounded-stitch border border-stitch-outline-variant/60 bg-white"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-xs font-bold text-stitch-on-surface uppercase tracking-wider">
              {location.pathname === "/dashboard"
                ? "Workspace Overview"
                : location.pathname === "/tasks"
                ? "Tasks"
                : location.pathname === "/settings"
                ? "Settings"
                : "Projects Directory"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="neutral">
              {profile?.role || "user"}
            </Badge>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-stitch-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
