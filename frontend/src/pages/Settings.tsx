import React, { useState, useEffect } from "react";
import { ProjectLayout } from "../features/projects/components/ProjectLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { useAuthStore } from "../store/authStore";
import { useProjects } from "../features/projects/hooks/useProjects";
import { useTasks } from "../features/tasks/hooks/useTasks";
import { config } from "../config";
import axios from "axios";
import {
  User,
  Eye,
  Bell,
  Building,
  Cpu,
  Info,
  ChevronRight,
  Monitor,
  Moon,
  Sun,
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

type SettingsTab = "profile" | "appearance" | "notifications" | "workspace" | "ai" | "about";

export const Settings: React.FC = () => {
  const { profile, setProfile } = useAuthStore();
  const { projects } = useProjects();
  const { tasks } = useTasks();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // ── 1. Profile Settings State ──────────────────────────────────────────────
  const [fullName, setFullName] = useState(profile?.display_name || "");
  const [email] = useState(profile?.email || "");
  const [jobTitle, setJobTitle] = useState(() => localStorage.getItem("settings-job-title") || "Software Engineer");
  const [timezone, setTimezone] = useState(() => localStorage.getItem("settings-timezone") || "UTC");

  useEffect(() => {
    if (profile?.display_name) {
      setFullName(profile.display_name);
    }
  }, [profile]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    // Update in-memory auth store profile
    if (profile) {
      setProfile({
        ...profile,
        display_name: fullName.trim()
      });
    }

    localStorage.setItem("settings-job-title", jobTitle);
    localStorage.setItem("settings-timezone", timezone);
    triggerToast("Profile settings updated successfully!");
  };

  // ── 2. Appearance Settings State ───────────────────────────────────────────
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("settings-theme") as any) || "system";
  });

  const handleSaveAppearance = (selectedTheme: "light" | "dark" | "system") => {
    setTheme(selectedTheme);
    localStorage.setItem("settings-theme", selectedTheme);
    triggerToast(`Theme set to ${selectedTheme}`);
  };

  // ── 3. Notification Settings State ─────────────────────────────────────────
  const [notifAssigned, setNotifAssigned] = useState(() => localStorage.getItem("notif-assigned") !== "false");
  const [notifDueDate, setNotifDueDate] = useState(() => localStorage.getItem("notif-duedate") !== "false");
  const [notifUpdates, setNotifUpdates] = useState(() => localStorage.getItem("notif-updates") !== "false");
  const [notifWeekly, setNotifWeekly] = useState(() => localStorage.getItem("notif-weekly") === "true");

  const handleSaveNotifications = () => {
    localStorage.setItem("notif-assigned", String(notifAssigned));
    localStorage.setItem("notif-duedate", String(notifDueDate));
    localStorage.setItem("notif-updates", String(notifUpdates));
    localStorage.setItem("notif-weekly", String(notifWeekly));
    triggerToast("Notification preferences updated!");
  };

  // ── 5. AI Preferences Settings State ───────────────────────────────────────
  const [aiEnabled, setAiEnabled] = useState(() => localStorage.getItem("ai-enabled") !== "false");
  const [aiSystemPrompt, setAiSystemPrompt] = useState(() => {
    return localStorage.getItem("ai-system-prompt") || "You are SprintMind Assistant, a helpful AI product management companion.";
  });

  const handleSaveAI = () => {
    localStorage.setItem("ai-enabled", String(aiEnabled));
    localStorage.setItem("ai-system-prompt", aiSystemPrompt);
    triggerToast("AI configurations saved!");
  };

  // ── 6. About Settings State (Backend Health Polling) ────────────────────────
  const [backendHealth, setBackendHealth] = useState<"healthy" | "unhealthy" | "checking">("checking");
  const [healthDetail, setHealthDetail] = useState<string>("");

  useEffect(() => {
    if (activeTab === "about") {
      setBackendHealth("checking");
      axios.get(`${config.apiUrl}/health`)
        .then((res) => {
          setBackendHealth("healthy");
          setHealthDetail(res.data?.status || "Running");
        })
        .catch(() => {
          setBackendHealth("unhealthy");
          setHealthDetail("Connection failed");
        });
    }
  }, [activeTab]);

  return (
    <ProjectLayout>
      <div className="space-y-8 max-w-5xl mx-auto px-4 md:px-6 py-6 min-h-[500px] relative text-stitch-on-surface">
        
        {/* Success Slide-in Toast */}
        {successToast && (
          <div
            id="success-toast"
            className="fixed bottom-6 right-6 border-l-4 border-emerald-500 bg-white text-stitch-on-surface px-4.5 py-3.5 rounded-r-lg shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in z-50 border border-stitch-outline-variant/60"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Workspace Settings Header */}
        <section className="border-b border-stitch-outline-variant/50 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-stitch-on-surface font-sans">Settings</h1>
          <p className="text-xs text-stitch-on-surface-variant mt-1.5 font-medium">
            Manage your user profile details, application appearance layout, and workspace preferences.
          </p>
        </section>

        {/* Navigation Sidebar & Pane Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Tab Sidebar */}
          <aside className="md:col-span-3 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 md:border-r md:border-stitch-outline-variant/60 md:pr-4">
            {[
              { id: "profile", label: "My Profile", icon: User },
              { id: "appearance", label: "Appearance", icon: Eye },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "workspace", label: "Workspace Info", icon: Building },
              { id: "ai", label: "AI Preferences", icon: Cpu },
              { id: "about", label: "About System", icon: Info }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 text-left w-full ${
                    activeTab === tab.id
                      ? "bg-stitch-primary/10 text-stitch-primary border border-stitch-primary/15"
                      : "text-stitch-on-surface-variant hover:bg-stitch-surface-container/30 hover:text-stitch-on-surface"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{tab.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 md:group-hover:opacity-100 md:opacity-40" />
                </button>
              );
            })}
          </aside>

          {/* Settings Sub-Panes */}
          <main className="md:col-span-9">
            
            {/* 1. Profile Page */}
            {activeTab === "profile" && (
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stitch-on-surface font-sans">Profile Details</h3>
                  <p className="text-[11px] text-stitch-on-surface-variant/80 mt-1 leading-relaxed">
                    Update your full name, avatar settings, job title, and regional timezone.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {/* Avatar Row */}
                  <div className="flex items-center gap-4 p-4.5 bg-stitch-surface-container/20 border border-stitch-outline-variant/40 rounded-2xl">
                    <div className="w-12 h-12 rounded-full bg-stitch-primary/10 border-2 border-stitch-primary/20 text-stitch-primary flex items-center justify-center font-bold text-lg shadow-sm">
                      {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stitch-on-surface">Gradient Avatar Avatar</p>
                      <p className="text-[10px] text-stitch-on-surface-variant/60 mt-0.5">Custom avatars can be configured via Gravatar sync.</p>
                    </div>
                  </div>

                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                      Email Address
                    </label>
                    <Input
                      value={email}
                      disabled
                      className="bg-stitch-surface-container/30 border-stitch-outline-variant/40 opacity-70 cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Job Title"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                        Time Zone
                      </label>
                      <div className="relative">
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 select-none appearance-none"
                        >
                          <option value="UTC">UTC (GMT+00:00)</option>
                          <option value="EST">EST (GMT-05:00)</option>
                          <option value="PST">PST (GMT-08:00)</option>
                          <option value="IST">IST (GMT+05:30)</option>
                          <option value="CET">CET (GMT+01:00)</option>
                        </select>
                        <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-stitch-outline-variant/40 pt-4 flex justify-end">
                    <Button type="submit" variant="primary" size="sm" className="rounded-xl font-bold flex items-center gap-2">
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile Changes</span>
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* 2. Appearance Page */}
            {activeTab === "appearance" && (
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stitch-on-surface font-sans">Appearance Mode</h3>
                  <p className="text-[11px] text-stitch-on-surface-variant/80 mt-1 leading-relaxed">
                    Choose your theme appearance preference. Preferences are saved inside browser local storage.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: "light", label: "Light Mode", icon: Sun, color: "bg-amber-500/10 text-amber-500 border-amber-500/10" },
                    { id: "dark", label: "Dark Mode", icon: Moon, color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/10" },
                    { id: "system", label: "System Default", icon: Monitor, color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/10" }
                  ].map((item) => {
                    const ThemeIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSaveAppearance(item.id as any)}
                        className={`flex flex-col items-center justify-center p-6 border rounded-2xl transition-all duration-300 ${
                          theme === item.id
                            ? "border-stitch-primary bg-stitch-primary/5 text-stitch-primary shadow-sm"
                            : "border-stitch-outline-variant/50 bg-white text-stitch-on-surface-variant hover:border-stitch-primary/30"
                        }`}
                      >
                        <div className={`p-3 rounded-full mb-3 ${item.color}`}>
                          <ThemeIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* 3. Notifications Page */}
            {activeTab === "notifications" && (
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stitch-on-surface font-sans">Notification Preferences</h3>
                  <p className="text-[11px] text-stitch-on-surface-variant/80 mt-1 leading-relaxed">
                    Select where and when you'd like to get notified about workspace updates.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: "assigned", label: "Task Assigned", desc: "Notify me when a task gets assigned to my developer account.", state: notifAssigned, setter: setNotifAssigned },
                    { id: "due", label: "Due Date Reminders", desc: "Send alerts 24 hours before any associated task is due.", state: notifDueDate, setter: setNotifDueDate },
                    { id: "updates", label: "Project Updates", desc: "Notify me when status or files change in my joined projects.", state: notifUpdates, setter: setNotifUpdates },
                    { id: "weekly", label: "Weekly Summary Reports", desc: "Receive email reports summaries of completed sprints.", state: notifWeekly, setter: setNotifWeekly }
                  ].map((notif) => (
                    <div
                      key={notif.id}
                      className="flex items-start justify-between p-4 border border-stitch-outline-variant/40 rounded-2xl bg-stitch-surface-container/5 hover:bg-stitch-surface-container/10 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <label htmlFor={`notif-toggle-${notif.id}`} className="text-xs font-bold text-stitch-on-surface cursor-pointer">
                          {notif.label}
                        </label>
                        <p className="text-[10px] text-stitch-on-surface-variant/70 leading-relaxed">
                          {notif.desc}
                        </p>
                      </div>
                      <input
                        id={`notif-toggle-${notif.id}`}
                        type="checkbox"
                        checked={notif.state}
                        onChange={(e) => notif.setter(e.target.checked)}
                        className="w-4 h-4 rounded border-stitch-outline-variant text-stitch-primary focus:ring-stitch-primary/30 mt-1 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t border-stitch-outline-variant/40 pt-4 flex justify-end">
                  <Button onClick={handleSaveNotifications} variant="primary" size="sm" className="rounded-xl font-bold flex items-center gap-2">
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Notifications Preferences</span>
                  </Button>
                </div>
              </Card>
            )}

            {/* 4. Workspace Page */}
            {activeTab === "workspace" && (
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stitch-on-surface font-sans">Workspace Details</h3>
                  <p className="text-[11px] text-stitch-on-surface-variant/80 mt-1 leading-relaxed">
                    View active status stats, total workspaces, projects and connected team users.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-stitch-surface-container/20 border border-stitch-outline-variant/40 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-stitch-on-surface-variant/60 uppercase tracking-wider">Workspace Name</p>
                      <p className="text-sm font-bold text-stitch-on-surface mt-1">SprintMind AI Developer Sandbox</p>
                    </div>
                    <Badge variant="success">Free Sandbox Tier</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border border-stitch-outline-variant/50 rounded-2xl bg-white text-center">
                      <p className="text-lg font-black text-stitch-on-surface">{projects.length}</p>
                      <p className="text-[10px] font-bold text-stitch-on-surface-variant/60 uppercase tracking-wider mt-1">Total Projects</p>
                    </div>
                    <div className="p-4 border border-stitch-outline-variant/50 rounded-2xl bg-white text-center">
                      <p className="text-lg font-black text-stitch-on-surface">{tasks.length}</p>
                      <p className="text-[10px] font-bold text-stitch-on-surface-variant/60 uppercase tracking-wider mt-1">Total Tasks</p>
                    </div>
                    <div className="p-4 border border-stitch-outline-variant/50 rounded-2xl bg-white text-center">
                      <p className="text-lg font-black text-stitch-on-surface">6</p>
                      <p className="text-[10px] font-bold text-stitch-on-surface-variant/60 uppercase tracking-wider mt-1">Active Users</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* 5. AI Preferences Page */}
            {activeTab === "ai" && (
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stitch-on-surface font-sans">AI Configuration Preferences</h3>
                  <p className="text-[11px] text-stitch-on-surface-variant/80 mt-1 leading-relaxed">
                    Set up preferences for future-ready AI agentic features (disabled until connected).
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-stitch-outline-variant/40 rounded-2xl bg-stitch-surface-container/5">
                    <div>
                      <span className="text-xs font-bold text-stitch-on-surface">Enable AI Contextual Insights</span>
                      <p className="text-[10px] text-stitch-on-surface-variant/70 leading-relaxed mt-0.5">Let AI compile workspace summaries on active sprints.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiEnabled}
                      onChange={(e) => setAiEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-stitch-outline-variant text-stitch-primary focus:ring-stitch-primary/30 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">Preferred Provider</label>
                      <select disabled className="w-full px-3 py-2.5 bg-stitch-surface-container/40 border border-stitch-outline-variant/40 rounded-xl text-sm text-stitch-on-surface-variant/60 cursor-not-allowed">
                        <option>Google Gemini AI</option>
                      </select>
                    </div>
                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">Preferred Model</label>
                      <select disabled className="w-full px-3 py-2.5 bg-stitch-surface-container/40 border border-stitch-outline-variant/40 rounded-xl text-sm text-stitch-on-surface-variant/60 cursor-not-allowed">
                        <option>Gemini 1.5 Flash (Default)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <div className="flex justify-between text-xs font-semibold text-stitch-on-surface-variant mb-1">
                      <span>Model Temperature</span>
                      <span>0.4 (Strict / Deterministic)</span>
                    </div>
                    <input type="range" disabled min="0" max="1" step="0.1" value="0.4" className="w-full opacity-60 cursor-not-allowed" />
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">System Instruction Prompt Preview</label>
                    <textarea
                      value={aiSystemPrompt}
                      onChange={(e) => setAiSystemPrompt(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 resize-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="border-t border-stitch-outline-variant/40 pt-4 flex justify-end">
                  <Button onClick={handleSaveAI} variant="primary" size="sm" className="rounded-xl font-bold flex items-center gap-2">
                    <Save className="w-3.5 h-3.5" />
                    <span>Save AI Configurations</span>
                  </Button>
                </div>
              </Card>
            )}

            {/* 6. About Page */}
            {activeTab === "about" && (
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stitch-on-surface font-sans">System Diagnostics & Information</h3>
                  <p className="text-[11px] text-stitch-on-surface-variant/80 mt-1 leading-relaxed">
                    View active builds information, environment targets, and server diagnostics.
                  </p>
                </div>

                <div className="divide-y divide-stitch-outline-variant/30 text-xs">
                  <div className="flex justify-between py-3">
                    <span className="font-bold text-stitch-on-surface-variant/80">App Version</span>
                    <span className="font-semibold text-stitch-on-surface">v1.2.0 (Tasks & Board release)</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="font-bold text-stitch-on-surface-variant/80">Build Date</span>
                    <span className="font-semibold text-stitch-on-surface">July 17, 2026</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="font-bold text-stitch-on-surface-variant/80">Environment</span>
                    <Badge variant="neutral" className="capitalize">{config.environment}</Badge>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="font-bold text-stitch-on-surface-variant/80">Frontend Core Engine</span>
                    <span className="font-semibold text-stitch-on-surface">Vite v5.4.21 & React v18.3.1</span>
                  </div>
                  <div className="flex justify-between py-3 items-center">
                    <span className="font-bold text-stitch-on-surface-variant/80">Backend Health Status</span>
                    {backendHealth === "checking" ? (
                      <span className="text-[11px] font-bold text-zinc-500">Connecting…</span>
                    ) : backendHealth === "healthy" ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Online ({healthDetail})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-stitch-error font-bold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Offline ({healthDetail})</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

          </main>

        </div>

      </div>
    </ProjectLayout>
  );
};
export default Settings;
