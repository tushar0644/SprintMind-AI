import React, { useState, useEffect, useRef } from "react";
import { useProjects } from "../hooks/useProjects";
import { useTasks } from "../../tasks/hooks/useTasks";
import { EmptyState } from "../components/EmptyState";
import { Project } from "../types";
import { ProjectLayout } from "../components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Input } from "../../../components/ui/Input";
import {
  Plus,
  Search,
  Folder,
  Calendar,
  CheckSquare,
  MoreVertical,
  Edit2,
  Archive,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronDown
} from "lucide-react";

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "progress";

export const Projects: React.FC = () => {
  const {
    projects,
    loading,
    error,
    setError,
    createProject,
    updateProject,
    deleteProject
  } = useProjects();

  // Load all tasks to compute statistics and progress per project
  const { tasks } = useTasks();

  // Dialog and Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");

  // UI Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Client Validation Warnings
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const handleOpenCreate = () => {
    setName("");
    setDescription("");
    setStatus("active");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setName(project.name);
    setDescription(project.description || "");
    setStatus(project.status);
    setFormError(null);
    setEditingProject(project);
    setActiveMenuId(null);
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setFormError("Project name is required.");
      return false;
    }
    if (name.length < 3 || name.length > 100) {
      setFormError("Project name must be between 3 and 100 characters.");
      return false;
    }
    if (description.length > 500) {
      setFormError("Description cannot exceed 500 characters.");
      return false;
    }
    return true;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitLoading(true);
    setFormError(null);
    try {
      await createProject(name, description, status);
      setIsCreateOpen(false);
      triggerToast("Project created successfully!");
    } catch (err: any) {
      setFormError(err.message || "Failed to create project.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !editingProject) return;

    setSubmitLoading(true);
    setFormError(null);
    try {
      await updateProject(editingProject.id, name, description, status);
      setEditingProject(null);
      triggerToast("Project updated successfully!");
    } catch (err: any) {
      setFormError(err.message || "Failed to update project.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingProject) return;

    setSubmitLoading(true);
    try {
      await deleteProject(deletingProject.id);
      triggerToast("Project archived successfully!");
      setDeletingProject(null);
    } catch (err: any) {
      setError(err.message || "Failed to archive project.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Helper function to calculate due date (30 days from creation)
  const getProjectDueDate = (project: Project): Date => {
    return new Date(new Date(project.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
  };

  // Helper function to get mock team members deterministically based on projectId
  const getTeamMembers = (projectId: string) => {
    const membersList = [
      { initials: "JD", color: "bg-indigo-500 text-white", name: "John Doe" },
      { initials: "AM", color: "bg-emerald-500 text-white", name: "Alex Miller" },
      { initials: "SR", color: "bg-rose-500 text-white", name: "Sarah Rogers" },
      { initials: "KP", color: "bg-amber-500 text-white", name: "Kevin Patel" },
      { initials: "LN", color: "bg-purple-500 text-white", name: "Lisa Nelson" }
    ];
    const safeId = projectId || "default";
    const code = safeId.charCodeAt(0);
    const index = isNaN(code) ? 2 : (code % 3 + 2);
    return membersList.slice(0, index);
  };

  // Derived tasks computations
  const getProjectTasks = (projectId: string) => {
    return tasks.filter(t => t.project_id === projectId);
  };

  const getProjectProgress = (projectId: string) => {
    const projectTasks = getProjectTasks(projectId);
    if (projectTasks.length === 0) return 0;
    const completed = projectTasks.filter(t => t.status === "done").length;
    return Math.round((completed / projectTasks.length) * 100);
  };

  // Statistics computations
  const totalProjects = projects.length;
  const activeProjectsCount = projects.filter(p => p.status === "active").length;
  
  // Completed projects = archived OR projects where all tasks are "done" (min 1 task)
  const completedProjectsCount = projects.filter(p => {
    if (p.status === "archived") return true;
    const pTasks = getProjectTasks(p.id);
    return pTasks.length > 0 && pTasks.every(t => t.status === "done");
  }).length;

  // Overdue projects = active projects where current time is past due date
  const overdueProjectsCount = projects.filter(p => {
    if (p.status !== "active") return false;
    return getProjectDueDate(p) < new Date();
  }).length;

  // Filtering
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sorting
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "progress":
        return getProjectProgress(b.id) - getProjectProgress(a.id);
      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <ProjectLayout>
      <div className="space-y-8 max-w-6xl mx-auto relative min-h-[500px] px-4 md:px-6 py-4">
        {/* Redesigned Success Toast */}
        {successToast && (
          <div
            id="success-toast"
            className="fixed bottom-6 right-6 border-l-4 border-emerald-500 bg-white text-stitch-on-surface px-4.5 py-3.5 rounded-r-lg shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in z-50 border border-stitch-outline-variant/60 border-l-emerald-500"
          >
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
            </svg>
            <span>{successToast}</span>
          </div>
        )}

        {/* Header Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stitch-outline-variant/60 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stitch-on-surface tracking-tight font-sans">Workspace Projects</h1>
            <p className="text-xs text-stitch-on-surface-variant mt-1.5 leading-relaxed">
              Track progress, align team schedules, and manage active sprint deliverables.
            </p>
          </div>

          {projects.length > 0 && !loading && (
            <Button
              id="btn-create-project-trigger"
              onClick={handleOpenCreate}
              variant="primary"
              size="sm"
              className="flex items-center gap-2 select-none shrink-0 w-full md:w-auto shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-4 p-5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">Total Projects</p>
              <p className="text-xl font-extrabold text-stitch-on-surface mt-0.5">{totalProjects}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">Active</p>
              <p className="text-xl font-extrabold text-stitch-on-surface mt-0.5">{activeProjectsCount}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">Completed</p>
              <p className="text-xl font-extrabold text-stitch-on-surface mt-0.5">{completedProjectsCount}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">Overdue</p>
              <p className="text-xl font-extrabold text-stitch-on-surface mt-0.5">{overdueProjectsCount}</p>
            </div>
          </Card>
        </div>

        {/* Filters Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-stitch-surface-container/20 p-4 border border-stitch-outline-variant/50 rounded-2xl">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-stitch-on-surface-variant/60">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-9 pr-4 py-2 text-xs text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all duration-200"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Status Filter */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary select-none appearance-none font-medium"
              >
                <option value="all">All Projects</option>
                <option value="active">Active Only</option>
                <option value="archived">Archived Only</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
            </div>

            {/* Sorting Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full sm:w-auto bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary select-none appearance-none font-medium"
              >
                <option value="newest">Newest Created</option>
                <option value="oldest">Oldest Created</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="progress">Highest Progress</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/5 border border-red-500/10 text-stitch-error rounded-xl text-xs flex gap-2.5 max-w-lg mx-auto shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-stitch-on-surface-variant hover:text-stitch-on-surface font-bold">✕</button>
          </div>
        )}

        {/* Main Grid/Loading/Empty States */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-stitch-outline-variant bg-white rounded-2xl p-6 space-y-4 animate-pulse select-none">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-stitch-surface-container-high"></div>
                  <div className="w-16 h-5 rounded-full bg-stitch-surface-container-high"></div>
                </div>
                <div className="h-4 bg-stitch-surface-container-high rounded w-2/3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-stitch-surface-container-high rounded w-full"></div>
                  <div className="h-3 bg-stitch-surface-container-high rounded w-5/6"></div>
                </div>
                <div className="h-2 bg-stitch-surface-container-high rounded-full w-full"></div>
                <div className="border-t border-stitch-surface-container-high pt-4 flex items-center justify-between">
                  <div className="w-20 h-3 bg-stitch-surface-container-high rounded"></div>
                  <div className="w-10 h-6 bg-stitch-surface-container-high rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreateClick={handleOpenCreate} />
        ) : sortedProjects.length === 0 ? (
          /* Empty Search results */
          <Card className="flex flex-col items-center justify-center text-center p-12 border border-stitch-outline-variant/60 rounded-2xl bg-white max-w-md mx-auto mt-12 animate-fade-in select-none">
            <div className="w-12 h-12 rounded-full bg-stitch-surface-container text-stitch-on-surface-variant flex items-center justify-center mb-4">
              <Search className="w-5 h-5 text-stitch-on-surface-variant/80" />
            </div>
            <h3 className="text-sm font-semibold text-stitch-on-surface mb-1">No matching projects</h3>
            <p className="text-xs text-stitch-on-surface-variant max-w-xs leading-relaxed font-sans">
              We couldn't find any projects matching your search criteria. Try adjusting your query or status filter.
            </p>
          </Card>
        ) : (
          /* Projects list grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {sortedProjects.map((project) => {
              const projectTasks = getProjectTasks(project.id);
              const progressVal = getProjectProgress(project.id);
              const dueDate = getProjectDueDate(project);
              const team = getTeamMembers(project.id);

              return (
                <Card
                  key={project.id}
                  hoverable={true}
                  className="project-card border-stitch-outline-variant hover:border-stitch-primary/30 flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 bg-white rounded-2xl p-6 relative group"
                >
                  <div className="space-y-4">
                    {/* Header: Logo, Status Badge, and Actions */}
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-xl bg-stitch-primary/10 text-stitch-primary flex items-center justify-center font-bold text-sm shrink-0 border border-stitch-primary/5 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        {project.name.charAt(0).toUpperCase()}
                      </span>

                      <div className="flex items-center gap-2.5">
                        <Badge variant={project.status === "active" ? "success" : "neutral"} className="rounded-lg tracking-wide uppercase px-2 py-0.5 text-[9px] font-bold">
                          {project.status}
                        </Badge>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(project);
                          }}
                          className="p-1 rounded-lg text-stitch-on-surface-variant/60 hover:text-stitch-primary hover:bg-stitch-surface-container transition-all duration-200"
                          title="Edit Project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingProject(project);
                          }}
                          className="p-1 rounded-lg text-stitch-on-surface-variant/60 hover:text-stitch-error hover:bg-red-50 transition-all duration-200"
                          title="Archive Project"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>

                        {/* Custom Dropdown Action Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === project.id ? null : project.id);
                            }}
                            className="p-1 rounded-lg text-stitch-on-surface-variant/60 hover:text-stitch-primary hover:bg-stitch-surface-container transition-all duration-200"
                            title="Options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === project.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 mt-1 w-36 bg-white border border-stitch-outline-variant rounded-xl shadow-xl z-30 py-1.5 animate-scale-in"
                            >
                              <button
                                onClick={() => handleOpenEdit(project)}
                                className="w-full text-left px-3 py-1.5 text-xs text-stitch-on-surface hover:bg-stitch-surface-container flex items-center gap-2 font-medium"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-stitch-on-surface-variant" />
                                Edit Project
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingProject(project);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-stitch-error hover:bg-red-50 flex items-center gap-2 font-medium"
                              >
                                <Archive className="w-3.5 h-3.5 text-stitch-error" />
                                Archive
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Project Title & Description */}
                    <div>
                      <h3 className="font-bold text-stitch-on-surface hover:text-stitch-primary transition-colors duration-200 tracking-tight text-sm font-sans mb-1.5">
                        {project.name}
                      </h3>
                      <p className="text-xs text-stitch-on-surface-variant line-clamp-2 min-h-[32px] leading-relaxed font-sans">
                        {project.description || "No description provided."}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-stitch-on-surface-variant">
                        <span>Progress</span>
                        <span>{progressVal}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-stitch-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stitch-primary transition-all duration-500 rounded-full"
                          style={{ width: `${progressVal}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Details */}
                  <div className="border-t border-stitch-outline-variant/60 pt-4 mt-5 flex flex-col gap-3">
                    {/* Tasks count & Due date row */}
                    <div className="flex items-center justify-between text-[11px] font-medium text-stitch-on-surface-variant/80">
                      <div className="flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-stitch-on-surface-variant/60" />
                        <span>
                          {projectTasks.filter(t => t.status === "done").length}/{projectTasks.length} Tasks
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stitch-on-surface-variant/60" />
                        <span>Due {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Team Members & Created Date */}
                    <div className="flex items-center justify-between border-t border-stitch-outline-variant/30 pt-3">
                      {/* Team Avatar Group */}
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {team.map((m, idx) => (
                          <div
                            key={idx}
                            className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold select-none cursor-pointer ${m.color}`}
                            title={m.name}
                          >
                            {m.initials}
                          </div>
                        ))}
                      </div>

                      <span className="text-[10px] text-stitch-on-surface-variant/50 font-medium">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* CREATE MODAL */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-stitch-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 select-none animate-fade-in">
            <Card className="max-w-md w-full border-stitch-outline-variant bg-white rounded-2xl p-6.5 shadow-2xl relative animate-scale-in">
              <h2 className="text-base font-bold text-stitch-on-surface mb-4 font-sans tracking-tight">Create New Project</h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-500/5 border border-red-500/10 text-stitch-error rounded-xl text-xs font-semibold leading-relaxed">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
                <Input
                  label="Project Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SprintMind Engine"
                  disabled={submitLoading}
                  required
                />

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Summarize objectives, deliverables, or stack details..."
                    rows={3}
                    disabled={submitLoading}
                    className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low resize-none leading-relaxed"
                  />
                </div>

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      disabled={submitLoading}
                      className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low select-none appearance-none"
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stitch-outline-variant/60 mt-6">
                  <Button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
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
                    {submitLoading ? "Saving..." : "Save Project"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* EDIT MODAL */}
        {editingProject && (
          <div className="fixed inset-0 bg-stitch-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 select-none animate-fade-in">
            <Card className="max-w-md w-full border-stitch-outline-variant bg-white rounded-2xl p-6.5 shadow-2xl relative animate-scale-in">
              <h2 className="text-base font-bold text-stitch-on-surface mb-4 font-sans tracking-tight">Edit Project Settings</h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-500/5 border border-red-500/10 text-stitch-error rounded-xl text-xs font-semibold leading-relaxed">
                  {formError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
                <Input
                  label="Project Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SprintMind Engine"
                  disabled={submitLoading}
                  required
                />

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Summarize objectives, deliverables, or stack details..."
                    rows={3}
                    disabled={submitLoading}
                    className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low resize-none leading-relaxed"
                  />
                </div>

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      disabled={submitLoading}
                      className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low select-none appearance-none"
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stitch-outline-variant/60 mt-6">
                  <Button
                    type="button"
                    onClick={() => setEditingProject(null)}
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
                    {submitLoading ? "Updating..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ARCHIVE CONFIRMATION DIALOG */}
        {deletingProject && (
          <div className="fixed inset-0 bg-stitch-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 select-none animate-fade-in">
            <Card className="max-w-sm w-full border-stitch-outline-variant bg-white rounded-2xl p-6 shadow-2xl relative animate-scale-in text-center">
              <div className="w-12 h-12 rounded-full bg-stitch-error/10 text-stitch-error border border-stitch-error/15 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-stitch-on-surface mb-1.5 font-sans tracking-tight">Archive Project?</h3>
              <p className="text-xs text-stitch-on-surface-variant mb-6 max-w-[280px] mx-auto leading-relaxed">
                Are you sure you want to archive <strong>{deletingProject.name}</strong>? This action can be undone by restoring status.
              </p>

              <div className="flex items-center justify-center gap-2.5">
                <Button
                  type="button"
                  onClick={() => setDeletingProject(null)}
                  disabled={submitLoading}
                  variant="secondary"
                  size="sm"
                  className="rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={submitLoading}
                  variant="danger"
                  size="sm"
                  className="bg-stitch-error hover:bg-red-700 text-white rounded-xl font-semibold"
                >
                  {submitLoading ? "Archiving..." : "Yes, Archive"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ProjectLayout>
  );
};
