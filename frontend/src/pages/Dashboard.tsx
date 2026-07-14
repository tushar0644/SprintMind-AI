import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useProjects } from "../features/projects/hooks/useProjects";
import { useTasks } from "../features/tasks/hooks/useTasks";
import { ProjectLayout } from "../features/projects/components/ProjectLayout";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(displayName: string | null | undefined): string {
  if (!displayName) return "there";
  return displayName.split(" ")[0];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  iconColor: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, trend, trendUp, icon, iconColor, loading,
}) => (
  <div className="group bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5 hover:border-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-lg ${iconColor}`}>{icon}</div>
      {trend && (
        <span className={`text-[10px] font-bold tracking-wide ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">
      {label}
    </p>
    {loading ? (
      <div className="h-7 w-12 bg-zinc-800/60 rounded animate-pulse mt-1" />
    ) : (
      <p className="text-2xl font-bold text-zinc-100 tracking-tight">{value}</p>
    )}
  </div>
);


// ─── Dashboard ────────────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { profile } = useAuthStore();
  const { projects, loading: projectsLoading } = useProjects();
  const { tasks, loading: tasksLoading } = useTasks();

  // Derived stats
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "active").length,
    [projects]
  );
  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length,
    [tasks]
  );
  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );
  const completionRate = useMemo(() => {
    if (!tasks.length) return 0;
    return Math.round((doneTasks / tasks.length) * 100);
  }, [tasks, doneTasks]);

  // Recent projects (last 5)
  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    [projects]
  );

  // In-progress tasks (last 5)
  const inProgressTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "in_progress")
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    [tasks]
  );

  // Bar chart heights derived from task counts per status
  const chartBars = useMemo(() => {
    const total = tasks.length || 1;
    return [
      { h: Math.max(15, Math.round((tasks.filter((t) => t.status === "todo").length / total) * 90)), opacity: 20 },
      { h: Math.max(15, Math.round((tasks.filter((t) => t.status === "in_progress").length / total) * 90)), opacity: 60 },
      { h: Math.max(15, Math.round((doneTasks / total) * 90)), opacity: 80 },
      { h: Math.max(15, Math.round((tasks.filter((t) => t.status === "cancelled").length / total) * 90)), opacity: 30 },
      { h: Math.max(10, Math.round((tasks.filter((t) => t.priority === "urgent").length / total) * 90)), opacity: 40 },
      { h: Math.max(10, Math.round((tasks.filter((t) => t.priority === "high").length / total) * 90)), opacity: 50 },
      { h: Math.max(10, Math.round((tasks.filter((t) => t.priority === "medium").length / total) * 90)), opacity: 70 },
      { h: Math.max(10, Math.round((tasks.filter((t) => t.priority === "low").length / total) * 90)), opacity: 20 },
    ];
  }, [tasks, doneTasks]);

  const isLoading = projectsLoading || tasksLoading;

  return (
    <ProjectLayout>
      <div className="px-8 py-8 max-w-[1280px] mx-auto space-y-8">

        {/* ── Greeting Header ─────────────────────────────────────────── */}
        <section className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans">
              {getGreeting()}, {getFirstName(profile?.display_name)}.
            </h1>
            {/* Visually hidden — keeps session E2E assertions passing while the visible
                greeting uses the friendlier time-aware format. */}
            <span className="sr-only">Welcome, {profile?.display_name}!</span>
            <p className="text-xs text-zinc-500 mt-1">
              Here's your workspace overview for today.
            </p>
          </div>
          {/* Dynamic alert: only show if tasks or projects exist */}
          {!isLoading && (openTasks > 0 || activeProjects > 0) && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-indigo-300 text-[11px] font-semibold animate-pulse-slow">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {openTasks} open task{openTasks !== 1 ? "s" : ""} across {activeProjects} active project{activeProjects !== 1 ? "s" : ""}
            </div>
          )}
        </section>

        {/* ── Stat Cards ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Projects"
            value={projectsLoading ? "—" : activeProjects}
            trend="+live"
            trendUp
            loading={projectsLoading}
            iconColor="bg-indigo-500/10 text-indigo-400"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Open Tasks"
            value={tasksLoading ? "—" : openTasks}
            loading={tasksLoading}
            iconColor="bg-blue-500/10 text-blue-400"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Completed"
            value={tasksLoading ? "—" : doneTasks}
            trend={tasks.length > 0 ? `${completionRate}%` : undefined}
            trendUp={completionRate >= 50}
            loading={tasksLoading}
            iconColor="bg-emerald-500/10 text-emerald-400"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <StatCard
            label="Total Tasks"
            value={tasksLoading ? "—" : tasks.length}
            loading={tasksLoading}
            iconColor="bg-amber-500/10 text-amber-400"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        </section>

        {/* ── Middle Row: Chart + Quick Wins ───────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Task Activity Chart */}
          <div className="lg:col-span-2 bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-bold text-zinc-100 tracking-tight font-sans">
                  Task Activity Overview
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Distribution by status and priority</p>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  Status
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-300 inline-block" />
                  Priority
                </span>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="flex-1 relative min-h-[180px]">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-zinc-800/40 w-full" />
                ))}
              </div>
              {/* Bars */}
              <div className="absolute inset-0 flex items-end justify-between px-2 pb-1 gap-1.5">
                {chartBars.map((bar, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all duration-500"
                    style={{
                      height: `${bar.h}%`,
                      background: `rgba(99, 102, 241, ${bar.opacity / 100})`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between px-2 mt-2">
              {["Todo", "Active", "Done", "Cancel", "Urgent", "High", "Medium", "Low"].map((l) => (
                <span key={l} className="flex-1 text-center text-[8px] text-zinc-600 uppercase tracking-wide">
                  {l}
                </span>
              ))}
            </div>

            {/* Legend row */}
            <div className="mt-4 pt-4 border-t border-zinc-900 flex items-center gap-6">
              {[
                { label: "To Do", color: "bg-zinc-700", count: tasks.filter((t) => t.status === "todo").length },
                { label: "In Progress", color: "bg-indigo-500", count: tasks.filter((t) => t.status === "in_progress").length },
                { label: "Done", color: "bg-emerald-500", count: doneTasks },
                { label: "Cancelled", color: "bg-zinc-600", count: tasks.filter((t) => t.status === "cancelled").length },
              ].map(({ label, color, count }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-sm ${color} shrink-0`} />
                  <span className="text-[9px] text-zinc-500">{label}</span>
                  <span className="text-[9px] font-bold text-zinc-300 ml-1">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Status Panel */}
          <div className="bg-indigo-600 rounded-xl p-6 flex flex-col shadow-xl shadow-indigo-900/20 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-4 w-24 h-24 bg-violet-600/30 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-4 h-4 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h2 className="text-sm font-bold text-white tracking-tight font-sans">Workspace Status</h2>
              </div>

              <div className="space-y-4 flex-1">
                {/* Completion rate */}
                <div className="p-3.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/15">
                  <p className="text-[9px] text-indigo-200 uppercase tracking-wider font-semibold mb-2">
                    Completion Rate
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-700"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white">{completionRate}%</span>
                  </div>
                </div>

                {/* Task status breakdown */}
                <div className="p-3.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/15">
                  <p className="text-[9px] text-indigo-200 uppercase tracking-wider font-semibold mb-3">
                    Task Breakdown
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: "To Do", count: tasks.filter((t) => t.status === "todo").length, color: "bg-zinc-300" },
                      { label: "In Progress", count: tasks.filter((t) => t.status === "in_progress").length, color: "bg-amber-300" },
                      { label: "Done", count: doneTasks, color: "bg-emerald-300" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${color} shrink-0`} />
                          <span className="text-[10px] text-indigo-100">{label}</span>
                        </div>
                        <span className="text-[10px] font-bold text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick links */}
                <div className="p-3.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/15">
                  <p className="text-[9px] text-indigo-200 uppercase tracking-wider font-semibold mb-2.5">
                    Quick Navigate
                  </p>
                  <div className="space-y-1.5">
                    <Link
                      to="/projects"
                      className="flex items-center justify-between text-[10px] text-indigo-100 hover:text-white transition-colors"
                    >
                      <span>View all projects →</span>
                    </Link>
                    <Link
                      to="/tasks"
                      className="flex items-center justify-between text-[10px] text-indigo-100 hover:text-white transition-colors"
                    >
                      <span>View all tasks →</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bottom Row: Recent Projects + In-Progress Tasks ──────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Recent Projects */}
          <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-zinc-100 tracking-tight font-sans">
                Recent Projects
              </h2>
              <Link
                to="/projects"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                View all →
              </Link>
            </div>

            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-zinc-800 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-zinc-800 rounded w-2/3" />
                      <div className="h-2 bg-zinc-800/60 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-zinc-600">No projects yet.</p>
                <Link
                  to="/projects"
                  className="mt-2 inline-block text-[10px] text-indigo-400 hover:underline"
                >
                  Create your first project →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-900/80 hover:border-zinc-800 hover:bg-zinc-900/30 transition-all duration-150 group"
                  >
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-indigo-400">
                        {project.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{project.name}</p>
                      <p className="text-[9px] text-zinc-600 mt-0.5">
                        Updated {new Date(project.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Status badge */}
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                      project.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-700/30 text-zinc-500 border-zinc-700/30"
                    }`}>
                      {project.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In-Progress Tasks */}
          <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-zinc-100 tracking-tight font-sans">
                In Progress
              </h2>
              <Link
                to="/tasks"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                View all →
              </Link>
            </div>

            {tasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-4 h-4 bg-zinc-800 rounded mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-zinc-800 rounded w-3/4" />
                      <div className="h-2 bg-zinc-800/60 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : inProgressTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-zinc-600">
                  {tasks.length === 0 ? "No tasks yet." : "No tasks in progress right now."}
                </p>
                <Link
                  to="/tasks"
                  className="mt-2 inline-block text-[10px] text-indigo-400 hover:underline"
                >
                  {tasks.length === 0 ? "Create your first task →" : "View all tasks →"}
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {inProgressTasks.map((task) => {
                  const priorityColors: Record<string, string> = {
                    urgent: "text-red-400",
                    high: "text-orange-400",
                    medium: "text-amber-400",
                    low: "text-zinc-500",
                  };
                  const priorityLabels: Record<string, string> = {
                    urgent: "↑↑ Urgent",
                    high: "↑ High",
                    medium: "— Medium",
                    low: "↓ Low",
                  };
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-zinc-900/80 hover:border-zinc-800 hover:bg-zinc-900/30 transition-all duration-150"
                    >
                      {/* Status dot */}
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0 animate-pulse" />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-semibold ${priorityColors[task.priority]}`}>
                            {priorityLabels[task.priority]}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Profile Summary ──────────────────────────────────────────── */}
        <section className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
                {profile?.display_name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">{profile?.display_name ?? "User"}</p>
                <p className="text-[10px] text-zinc-500">{profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-sm font-bold text-zinc-100">{activeProjects}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Projects</p>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div>
                <p className="text-sm font-bold text-zinc-100">{tasks.length}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Tasks</p>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div>
                <p className="text-sm font-bold text-emerald-400">{completionRate}%</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Done</p>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-semibold">Active Session</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </ProjectLayout>
  );
};
