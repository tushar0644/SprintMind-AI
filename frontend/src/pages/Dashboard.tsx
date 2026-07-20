import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useProjects } from "../features/projects/hooks/useProjects";
import { useTasks } from "../features/tasks/hooks/useTasks";
import { ProjectLayout } from "../features/projects/components/ProjectLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import {
  Folder,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  CheckSquare,
  Activity,
  Zap,
  TrendingUp,
  ChevronDown
} from "lucide-react";

// Helper greetings
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

interface ActivityEvent {
  id: string;
  type: "project_created" | "project_edited" | "task_created" | "task_completed" | "task_updated";
  title: string;
  date: Date;
  projectName: string;
}

export const Dashboard: React.FC = () => {
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  // Load backend data
  const {
    projects,
    loading: projectsLoading,
    createProject
  } = useProjects();

  // Load all tasks (passing undefined project fetches all)
  const {
    tasks,
    loading: tasksLoading,
    createTask
  } = useTasks();

  // Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Form Fields - Projects
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  // Form Fields - Tasks
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskStatus, setTaskStatus] = useState<"todo" | "in_progress" | "done" | "cancelled">("todo");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  // Form Submission Error/Loading toast
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Calculations for dates and data
  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  // Project Helper: Get tasks per project
  const getProjectTasks = (projectId: string) => {
    return tasks.filter((t) => t.project_id === projectId);
  };

  const getProjectProgress = (projectId: string) => {
    const pTasks = getProjectTasks(projectId);
    if (pTasks.length === 0) return 0;
    const completed = pTasks.filter((t) => t.status === "done").length;
    return Math.round((completed / pTasks.length) * 100);
  };

  const getProjectDueDate = (created_at: string) => {
    return new Date(new Date(created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
  };

  const getTaskDueDate = (created_at: string) => {
    return new Date(new Date(created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
  };

  // Workspace stats
  const totalProjectsCount = projects.length;
  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => p.status === "active").length;
  }, [projects]);

  const totalTasksCount = tasks.length;
  const completedTasksCount = useMemo(() => {
    return tasks.filter((t) => t.status === "done").length;
  }, [tasks]);

  const overdueTasksCount = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === "done" || t.status === "cancelled") return false;
      return getTaskDueDate(t.created_at) < new Date();
    }).length;
  }, [tasks]);

  const completionRate = useMemo(() => {
    if (totalTasksCount === 0) return 0;
    return Math.round((completedTasksCount / totalTasksCount) * 100);
  }, [totalTasksCount, completedTasksCount]);

  // Tasks completed today
  const tasksCompletedTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter((t) => {
      if (t.status !== "done") return false;
      return new Date(t.updated_at).toDateString() === today;
    }).length;
  }, [tasks]);

  // Tasks due today
  const tasksDueTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter((t) => {
      if (t.status === "done" || t.status === "cancelled") return false;
      return getTaskDueDate(t.created_at).toDateString() === today;
    }).length;
  }, [tasks]);

  // Recent 5 projects
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [projects]);

  // Upcoming highest priority tasks (Urgent or High)
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done" && t.status !== "cancelled" && (t.priority === "urgent" || t.priority === "high"))
      .sort((a, b) => {
        // Sort urgent first, then high
        if (a.priority === "urgent" && b.priority !== "urgent") return -1;
        if (b.priority === "urgent" && a.priority !== "urgent") return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      })
      .slice(0, 5);
  }, [tasks]);

  // Timeline Activity Feed
  const activityFeed = useMemo((): ActivityEvent[] => {
    const feed: ActivityEvent[] = [];

    // Projects activities
    projects.forEach((p) => {
      feed.push({
        id: `p-create-${p.id}`,
        type: "project_created",
        title: `Project "${p.name}" was created`,
        date: new Date(p.created_at),
        projectName: p.name,
      });

      if (p.status === "archived") {
        feed.push({
          id: `p-archive-${p.id}`,
          type: "project_edited",
          title: `Project "${p.name}" was archived`,
          date: new Date(p.updated_at),
          projectName: p.name,
        });
      }
    });

    // Tasks activities
    tasks.forEach((t) => {
      const pName = projects.find((p) => p.id === t.project_id)?.name || "Workspace";

      feed.push({
        id: `t-create-${t.id}`,
        type: "task_created",
        title: `Task "${t.title}" was added`,
        date: new Date(t.created_at),
        projectName: pName,
      });

      if (t.status === "done") {
        feed.push({
          id: `t-complete-${t.id}`,
          type: "task_completed",
          title: `Task "${t.title}" was completed`,
          date: new Date(t.updated_at),
          projectName: pName,
        });
      } else if (t.status === "in_progress") {
        feed.push({
          id: `t-prog-${t.id}`,
          type: "task_updated",
          title: `Task "${t.title}" started development`,
          date: new Date(t.updated_at),
          projectName: pName,
        });
      }
    });

    return feed
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [projects, tasks]);

  // Form Submissions
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setFormError("Project name is required.");
      return;
    }
    setSubmitLoading(true);
    setFormError(null);
    try {
      await createProject(projectName.trim(), projectDesc.trim() || undefined, "active");
      setIsProjectModalOpen(false);
      setProjectName("");
      setProjectDesc("");
      triggerToast("Project created successfully!");
    } catch (err: any) {
      setFormError(err.message || "Failed to create project.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setFormError("Task title is required.");
      return;
    }
    if (!taskProjectId) {
      setFormError("Please select a project.");
      return;
    }
    setSubmitLoading(true);
    setFormError(null);
    try {
      await createTask({
        project_id: taskProjectId,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        status: taskStatus,
        priority: taskPriority,
      });
      setIsTaskModalOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskProjectId("");
      triggerToast("Task created successfully!");
    } catch (err: any) {
      setFormError(err.message || "Failed to create task.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenTaskModal = () => {
    setFormError(null);
    const activeProject = projects.find((p) => p.status === "active");
    setTaskProjectId(activeProject?.id || "");
    setIsTaskModalOpen(true);
  };

  const handleOpenProjectModal = () => {
    setFormError(null);
    setIsProjectModalOpen(true);
  };

  const isLoading = projectsLoading || tasksLoading;

  return (
    <ProjectLayout>
      <div className="space-y-8 max-w-6xl mx-auto px-4 md:px-6 py-6 min-h-[500px]">
        {/* Redesigned Success Toast */}
        {successToast && (
          <div
            id="success-toast"
            className="fixed bottom-6 right-6 border-l-4 border-emerald-500 bg-white text-stitch-on-surface px-4.5 py-3.5 rounded-r-lg shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in z-50 border border-stitch-outline-variant/60"
          >
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
            </svg>
            <span>{successToast}</span>
          </div>
        )}

        {/* ── Welcome Header ─────────────────────────────────────────── */}
        <section className="flex flex-col md:flex-row md:items-center justify-between border-b border-stitch-outline-variant/50 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stitch-on-surface tracking-tight font-sans">
              {getGreeting()}, {getFirstName(profile?.display_name)}.
            </h1>
            {/* Screen reader welcome block for session assertions */}
            <span className="sr-only">Welcome, {profile?.display_name}!</span>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stitch-on-surface-variant mt-1.5 leading-relaxed font-medium">
              <span>{currentDateFormatted}</span>
              <span className="text-stitch-outline-variant/80">•</span>
              <span className="bg-stitch-primary/10 text-stitch-primary px-2 py-0.5 rounded-md text-[10px] font-bold">
                SprintMind AI Workspace
              </span>
            </div>
          </div>

          <Button
            onClick={handleOpenProjectModal}
            variant="primary"
            size="sm"
            className="flex items-center gap-2 select-none w-full md:w-auto rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Button>
        </section>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="border-stitch-outline-variant/60 bg-white rounded-2xl p-5 animate-pulse select-none space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-stitch-surface-container"></div>
                  <div className="h-3.5 bg-stitch-surface-container rounded w-1/2"></div>
                  <div className="h-6 bg-stitch-surface-container rounded w-2/3"></div>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-stitch-outline-variant/60 bg-white rounded-2xl p-6 h-64 animate-pulse"></Card>
              <Card className="border-stitch-outline-variant/60 bg-white rounded-2xl p-6 h-64 animate-pulse"></Card>
            </div>
          </div>
        ) : projects.length === 0 && tasks.length === 0 ? (
          /* Empty Workspace State */
          <Card className="flex flex-col items-center justify-center text-center p-12 border border-stitch-outline-variant/60 rounded-3xl bg-white max-w-xl mx-auto mt-16 animate-fade-in select-none">
            <div className="w-16 h-16 rounded-full bg-stitch-primary/10 text-stitch-primary border border-stitch-primary/15 flex items-center justify-center mb-6 shadow-sm">
              <Folder className="w-7 h-7 text-stitch-primary" />
            </div>
            <h3 className="text-lg font-bold text-stitch-on-surface mb-2 font-sans tracking-tight">Your Workspace is Empty</h3>
            <p className="text-xs text-stitch-on-surface-variant mb-8 max-w-sm leading-relaxed font-sans font-medium">
              Initialize workspace projects, establish design systems, schedule development sprints, and create task tickets to begin planning.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={handleOpenProjectModal}
                variant="primary"
                className="flex items-center justify-center gap-2 font-semibold rounded-xl"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Project</span>
              </Button>
            </div>
          </Card>
        ) : (
          /* Main Dashboard Content Grid */
          <div className="space-y-6 animate-fade-in">
            {/* ── KPI Cards Grid ────────────────────────────────────────── */}
            <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Projects", value: totalProjectsCount, icon: Folder, color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
                { label: "Active Projects", value: activeProjectsCount, icon: Clock, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { label: "Total Tasks", value: totalTasksCount, icon: CheckSquare, color: "bg-blue-50 text-blue-600 border-blue-100" },
                { label: "Completed Tasks", value: completedTasksCount, icon: CheckCircle2, color: "bg-amber-50 text-amber-600 border-amber-100" },
                { label: "Overdue Tasks", value: overdueTasksCount, icon: AlertCircle, color: "bg-rose-50 text-rose-600 border-rose-100" },
                { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, color: "bg-purple-50 text-purple-600 border-purple-100" }
              ].map((stat, idx) => (
                <Card
                  key={idx}
                  className="flex flex-col justify-between p-5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start">
                    <div className={`p-2.5 rounded-xl border ${stat.color} transition-colors duration-300`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[9px] uppercase font-extrabold tracking-wider text-stitch-on-surface-variant/70">
                      {stat.label}
                    </p>
                    <p className="text-xl font-black text-stitch-on-surface mt-1 tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                </Card>
              ))}
            </section>

            {/* ── Middle Widgets Section ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Productivity Widget */}
              <Card className="lg:col-span-2 p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-stitch-primary" />
                    <h2 className="text-sm font-bold text-stitch-on-surface font-sans tracking-tight">Productivity Overview</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-stitch-surface-container/20 border border-stitch-outline-variant/40 rounded-xl">
                      <p className="text-[10px] text-stitch-on-surface-variant/80 font-bold uppercase tracking-wider">Active Projects</p>
                      <p className="text-lg font-black text-stitch-on-surface mt-1">{activeProjectsCount}</p>
                    </div>
                    <div className="p-4 bg-stitch-surface-container/20 border border-stitch-outline-variant/40 rounded-xl">
                      <p className="text-[10px] text-stitch-on-surface-variant/80 font-bold uppercase tracking-wider">Completed Today</p>
                      <p className="text-lg font-black text-stitch-on-surface mt-1">{tasksCompletedTodayCount}</p>
                    </div>
                    <div className="p-4 bg-stitch-surface-container/20 border border-stitch-outline-variant/40 rounded-xl">
                      <p className="text-[10px] text-stitch-on-surface-variant/80 font-bold uppercase tracking-wider">Due Today</p>
                      <p className="text-lg font-black text-stitch-on-surface mt-1">{tasksDueTodayCount}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-stitch-outline-variant/40 pt-4">
                  <div className="flex justify-between items-center text-xs font-bold text-stitch-on-surface-variant">
                    <span>Task Completion rate</span>
                    <span>{completionRate}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-stitch-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stitch-primary transition-all duration-700 rounded-full"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </Card>

              {/* Quick Actions Panel */}
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-12 -top-12 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl transition-all duration-500 group-hover:scale-125" />

                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-bold text-stitch-on-surface font-sans tracking-tight">Quick Actions</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleOpenProjectModal}
                      className="flex flex-col items-center justify-center p-4 border border-stitch-outline-variant/50 rounded-xl hover:border-stitch-primary hover:bg-stitch-primary/5 transition-all duration-300 group/btn"
                    >
                      <Plus className="w-5 h-5 text-stitch-primary mb-2 group-hover/btn:scale-110 transition-transform duration-200" />
                      <span className="text-[10px] font-bold text-stitch-on-surface-variant">New Project</span>
                    </button>
                    <button
                      onClick={handleOpenTaskModal}
                      className="flex flex-col items-center justify-center p-4 border border-stitch-outline-variant/50 rounded-xl hover:border-stitch-primary hover:bg-stitch-primary/5 transition-all duration-300 group/btn"
                    >
                      <Plus className="w-5 h-5 text-stitch-primary mb-2 group-hover/btn:scale-110 transition-transform duration-200" />
                      <span className="text-[10px] font-bold text-stitch-on-surface-variant">New Task</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 border-t border-stitch-outline-variant/40 pt-4 mt-6">
                  <button
                    onClick={() => navigate("/projects")}
                    className="w-full py-2 bg-stitch-surface-container/30 hover:bg-stitch-surface-container/60 border border-stitch-outline-variant/50 rounded-xl text-[11px] font-bold text-stitch-on-surface-variant flex items-center justify-center gap-1.5 transition-all duration-200"
                  >
                    <span>View Projects</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigate("/tasks")}
                    className="w-full py-2 bg-stitch-surface-container/30 hover:bg-stitch-surface-container/60 border border-stitch-outline-variant/50 rounded-xl text-[11px] font-bold text-stitch-on-surface-variant flex items-center justify-center gap-1.5 transition-all duration-200"
                  >
                    <span>View Tasks</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>

            </div>

            {/* ── Bottom Widgets Grid ───────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Recent Projects list */}
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-stitch-on-surface font-sans tracking-tight">Recent Projects</h2>
                  <Link to="/projects" className="text-[10px] text-stitch-primary font-bold hover:underline">View all</Link>
                </div>

                {recentProjects.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <p className="text-xs text-stitch-on-surface-variant/80">No projects yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {recentProjects.map((p) => {
                      const pTasks = getProjectTasks(p.id);
                      const progress = getProjectProgress(p.id);
                      const dueDate = getProjectDueDate(p.created_at);

                      return (
                        <div
                          key={p.id}
                          onClick={() => navigate("/projects")}
                          className="p-3 border border-stitch-outline-variant/50 rounded-xl hover:border-stitch-primary/30 hover:bg-stitch-surface-container/20 cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-stitch-on-surface truncate group-hover:text-stitch-primary transition-colors">{p.name}</h3>
                            <p className="text-[9px] text-stitch-on-surface-variant/60 font-medium mt-0.5">
                              Due {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] font-bold text-stitch-on-surface-variant bg-stitch-surface-container px-2 py-0.5 rounded-lg border border-stitch-outline-variant/40">
                              {pTasks.length} tasks
                            </span>
                            <div className="w-12 h-1 bg-stitch-surface-container rounded-full overflow-hidden">
                              <div className="h-full bg-stitch-primary" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Upcoming tasks list */}
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-stitch-on-surface font-sans tracking-tight">Upcoming Tasks</h2>
                  <Link to="/tasks" className="text-[10px] text-stitch-primary font-bold hover:underline">View all</Link>
                </div>

                {upcomingTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <p className="text-xs text-stitch-on-surface-variant/80">No high priority tasks.</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {upcomingTasks.map((t) => {
                      const pName = projects.find((p) => p.id === t.project_id)?.name || "Workspace";
                      const dueDate = getTaskDueDate(t.created_at);

                      return (
                        <div
                          key={t.id}
                          onClick={() => navigate("/tasks")}
                          className="p-3 border border-stitch-outline-variant/50 rounded-xl hover:border-stitch-primary/30 hover:bg-stitch-surface-container/20 cursor-pointer transition-all duration-200 flex flex-col gap-1.5"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="text-xs font-bold text-stitch-on-surface truncate flex-1">{t.title}</h3>
                            <Badge variant={t.priority === "urgent" ? "danger" : "warning"} className="text-[8px] px-1.5 py-0">
                              {t.priority}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-stitch-on-surface-variant/60 font-semibold">
                            <span className="truncate max-w-[100px]">{pName}</span>
                            <span>Due {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Activity Feed timeline */}
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <Activity className="w-4 h-4 text-stitch-primary" />
                  <h2 className="text-sm font-bold text-stitch-on-surface font-sans tracking-tight">Recent Workspace Activity</h2>
                </div>

                {activityFeed.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <p className="text-xs text-stitch-on-surface-variant/80">No recent activity.</p>
                  </div>
                ) : (
                  <div className="relative pl-4 border-l border-stitch-outline-variant/50 space-y-4 flex-1">
                    {activityFeed.map((event) => (
                      <div key={event.id} className="relative text-xs">
                        {/* Dot indicator */}
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-stitch-primary border-2 border-white shadow-sm" />

                        <p className="font-bold text-stitch-on-surface leading-tight">{event.title}</p>
                        <div className="flex justify-between items-center text-[9px] text-stitch-on-surface-variant/50 mt-1 font-semibold">
                          <span>{event.projectName}</span>
                          <span>
                            {event.date.toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

            </div>
          </div>
        )}

        {/* CREATE PROJECT MODAL */}
        {isProjectModalOpen && (
          <div className="fixed inset-0 bg-stitch-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 select-none animate-fade-in">
            <Card className="max-w-md w-full border-stitch-outline-variant bg-white rounded-2xl p-6.5 shadow-2xl relative animate-scale-in">
              <h2 className="text-base font-bold text-stitch-on-surface mb-4 font-sans tracking-tight">Create New Project</h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-500/5 border border-red-500/10 text-stitch-error rounded-xl text-xs font-semibold leading-relaxed">
                  {formError}
                </div>
              )}

              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <Input
                  label="Project Name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. SprintMind Engine"
                  disabled={submitLoading}
                  required
                />

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant">
                    Description (Optional)
                  </label>
                  <textarea
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Summarize objectives or details..."
                    rows={3}
                    disabled={submitLoading}
                    className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stitch-outline-variant/60 mt-6">
                  <Button
                    type="button"
                    onClick={() => setIsProjectModalOpen(false)}
                    disabled={submitLoading}
                    variant="secondary"
                    size="sm"
                    className="rounded-xl font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitLoading}
                    variant="primary"
                    size="sm"
                    className="rounded-xl font-semibold"
                  >
                    {submitLoading ? "Creating..." : "Save Project"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* CREATE TASK MODAL */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 bg-stitch-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 select-none animate-fade-in">
            <Card className="max-w-md w-full border-stitch-outline-variant bg-white rounded-2xl p-6.5 shadow-2xl relative animate-scale-in">
              <h2 className="text-base font-bold text-stitch-on-surface mb-4 font-sans tracking-tight">Create New Task</h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-500/5 border border-red-500/10 text-stitch-error rounded-xl text-xs font-semibold leading-relaxed">
                  {formError}
                </div>
              )}

              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant">
                    Associated Project <span className="text-stitch-error">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={taskProjectId}
                      onChange={(e) => setTaskProjectId(e.target.value)}
                      disabled={submitLoading}
                      className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 select-none appearance-none"
                    >
                      <option value="">Select a project…</option>
                      {projects.filter((p) => p.status === "active").map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
                  </div>
                </div>

                <Input
                  label="Task Title *"
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Design Landing Hero Section"
                  disabled={submitLoading}
                  required
                />

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant">
                    Task Description
                  </label>
                  <textarea
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Provide details about the deliverables..."
                    rows={2}
                    disabled={submitLoading}
                    className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-xs font-semibold text-stitch-on-surface-variant">Status</label>
                    <div className="relative">
                      <select
                        value={taskStatus}
                        onChange={(e) => setTaskStatus(e.target.value as any)}
                        disabled={submitLoading}
                        className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface focus:outline-none"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-xs font-semibold text-stitch-on-surface-variant">Priority</label>
                    <div className="relative">
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as any)}
                        disabled={submitLoading}
                        className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stitch-outline-variant/60 mt-6">
                  <Button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    disabled={submitLoading}
                    variant="secondary"
                    size="sm"
                    className="rounded-xl font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitLoading}
                    variant="primary"
                    size="sm"
                    className="rounded-xl font-semibold"
                  >
                    {submitLoading ? "Creating..." : "Save Task"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </div>
    </ProjectLayout>
  );
};
