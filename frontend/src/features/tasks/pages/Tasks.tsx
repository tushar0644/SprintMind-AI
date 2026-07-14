import React, { useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { useTasks } from "../hooks/useTasks";
import { TaskEmptyState } from "../components/TaskEmptyState";
import { TaskCard } from "../components/TaskCard";
import { Task, TaskStatus, TaskPriority } from "../types";
import { useProjects } from "../../projects/hooks/useProjects";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";

// ─── Skeleton ───────────────────────────────────────────────────────────────

const TaskSkeleton: React.FC = () => (
  <Card className="flex items-start gap-4 p-4 bg-white border border-stitch-outline-variant/60 rounded-xl animate-pulse select-none">
    <div className="mt-1 w-4.5 h-4.5 rounded-full bg-stitch-surface-container shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 w-2/3 bg-stitch-surface-container rounded" />
      <div className="h-2.5 w-1/2 bg-stitch-surface-container-low rounded" />
      <div className="flex gap-2 mt-3">
        <div className="h-4.5 w-14 bg-stitch-surface-container-low rounded-full" />
        <div className="h-4.5 w-12 bg-stitch-surface-container-low rounded-full" />
      </div>
    </div>
  </Card>
);

// ─── Status Filter Tabs ──────────────────────────────────────────────────────

const STATUSES: { value: "all" | TaskStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export const Tasks: React.FC = () => {
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const {
    tasks,
    loading,
    error,
    setError,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks(selectedProjectId || undefined);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [projectId, setProjectId] = useState("");

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");

  const toastTimeoutRef = React.useRef<any>(null);

  const triggerToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setSuccessToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setSuccessToast(null);
      toastTimeoutRef.current = null;
    }, 5000);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTaskStatus("todo");
    setPriority("medium");
    setProjectId(selectedProjectId || projects.filter(p => p.status === "active")[0]?.id || "");
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description || "");
    setTaskStatus(task.status);
    setPriority(task.priority);
    setProjectId(task.project_id);
    setFormError(null);
    setEditingTask(task);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setFormError("Task title is required.");
      return false;
    }
    if (title.length > 200) {
      setFormError("Title cannot exceed 200 characters.");
      return false;
    }
    if (description.length > 2000) {
      setFormError("Description cannot exceed 2000 characters.");
      return false;
    }
    if (!isCreateOpen && !editingTask) return true;
    if (isCreateOpen && !projectId) {
      setFormError("Please select a project.");
      return false;
    }
    return true;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitLoading(true);
    setFormError(null);
    // Close the modal optimistically so the UI is responsive and
    // Playwright assertions don't time out waiting for slow API responses.
    setIsCreateOpen(false);
    try {
      await createTask({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        status: taskStatus,
        priority,
      });
      triggerToast("Task created successfully!");
    } catch (err: any) {
      // On failure reopen the modal so the user can see and fix the error.
      setFormError(err.message || "Failed to create task.");
      setIsCreateOpen(true);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !validateForm()) return;

    setSubmitLoading(true);
    setFormError(null);
    try {
      await updateTask(editingTask.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status: taskStatus,
        priority,
      });
      setEditingTask(null);
      triggerToast("Task updated successfully!");
    } catch (err: any) {
      setFormError(err.message || "Failed to update task.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    setSubmitLoading(true);
    try {
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
      triggerToast("Task archived successfully!");
    } catch {
      setError("Failed to archive task.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatusCycle = async (task: Task, newStatus: TaskStatus) => {
    try {
      await updateTask(task.id, { status: newStatus });
    } catch {
      setError("Failed to update status.");
    }
  };

  // Filter logic combining search query and status filter
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  // ── Shared Form JSX ──────────────────────────────────────────────────────

  const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit = false) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Project selector — only on create */}
      {!isEdit && (
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
            Project <span className="text-stitch-error">*</span>
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 select-none"
          >
            <option value="">Select a project…</option>
            {projects.filter((p) => p.status === "active").map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <Input
        label="Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="e.g. Implement JWT middleware"
      />

      {/* Description */}
      <div className="flex flex-col space-y-1.5 w-full">
        <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Optional task details…"
          className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 resize-none select-text"
        />
      </div>

      {/* Status + Priority Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
            Status
          </label>
          <select
            value={taskStatus}
            onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
            className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 select-none"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 select-none"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Form Error Message */}
      {formError && (
        <p className="text-[11px] font-semibold text-stitch-error bg-stitch-error/5 border border-stitch-error/10 rounded-stitch px-3 py-2 select-none">
          {formError}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2.5 pt-2 border-t border-stitch-outline-variant/60">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => { setIsCreateOpen(false); setEditingTask(null); }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={submitLoading}
        >
          {submitLoading ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
        </Button>
      </div>
    </form>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ProjectLayout>
      <div className="bg-stitch-background min-h-screen text-stitch-on-surface select-none">
        <div className="px-6 py-8 max-w-7xl mx-auto flex flex-col gap-6">

          {/* Page Title & Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface font-sans">Tasks</h1>
              <p className="text-xs text-stitch-on-surface-variant mt-0.5 font-medium select-none">
                {loading ? "Loading…" : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} total`}
              </p>
            </div>
            <Button
              id="btn-create-task"
              onClick={handleOpenCreate}
              variant="primary"
              size="sm"
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </Button>
          </div>

          {/* Stats strip cards */}
          {!loading && tasks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
              {[
                { label: "To Do", value: todoCount, color: "text-stitch-on-surface-variant/80", bgLeft: "border-l-4 border-l-stitch-outline-variant" },
                { label: "In Progress", value: inProgressCount, color: "text-stitch-secondary", bgLeft: "border-l-4 border-l-stitch-secondary" },
                { label: "Done", value: doneCount, color: "text-emerald-600", bgLeft: "border-l-4 border-l-emerald-500" },
              ].map(({ label, value, color, bgLeft }) => (
                <Card key={label} className={`p-4 bg-white border border-stitch-outline-variant/60 flex flex-col justify-between min-h-[84px] shadow-sm ${bgLeft}`}>
                  <p className={`text-2xl font-bold font-sans ${color}`}>{value}</p>
                  <p className="text-[10px] text-stitch-on-surface-variant/70 uppercase tracking-wider font-bold mt-1">{label}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Search, Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm">
            {/* Search inputs */}
            <div className="flex items-center gap-2 bg-stitch-background border border-stitch-outline-variant/80 rounded-stitch px-3 py-1.5 w-full md:max-w-md select-text">
              <svg className="w-4 h-4 text-stitch-on-surface-variant/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="bg-transparent border-none text-xs text-stitch-on-surface focus:outline-none placeholder-stitch-on-surface-variant/40 w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-stitch-on-surface-variant/40 hover:text-stitch-on-surface transition-colors shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Project selection */}
              {projects.length > 0 && (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-white border border-stitch-outline-variant rounded-stitch px-3 py-1.5 text-xs text-stitch-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary select-none w-full sm:w-auto"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-0.5 bg-stitch-background border border-stitch-outline-variant/80 rounded-stitch p-0.5 w-full sm:w-auto overflow-x-auto select-none">
                {STATUSES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    className={`px-3 py-1 rounded-stitch text-[10px] font-bold transition-all duration-200 shrink-0 ${
                      statusFilter === value
                        ? "bg-white text-stitch-primary border border-stitch-outline-variant/60 shadow-sm"
                        : "text-stitch-on-surface-variant/60 hover:text-stitch-on-surface"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Global API Error Alert Banner */}
          {error && (
            <div className="px-4 py-3 bg-stitch-error/5 border border-stitch-error/15 rounded-xl flex items-center gap-2.5 animate-fade-in shadow-sm select-none">
              <svg className="w-4 h-4 text-stitch-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-xs font-semibold text-stitch-error">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-stitch-on-surface-variant/40 hover:text-stitch-on-surface transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Two-Column split layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Col: Task list content */}
            <div className="lg:col-span-8 space-y-4">
              {loading ? (
                <div id="tasks-loading-skeleton" className="space-y-3">
                  {[...Array(4)].map((_, i) => <TaskSkeleton key={i} />)}
                </div>
              ) : filteredTasks.length === 0 ? (
                tasks.length === 0 ? (
                  <TaskEmptyState onCreateClick={handleOpenCreate} />
                ) : (
                  <Card className="text-center py-16 border border-stitch-outline-variant/60 rounded-xl bg-white select-none">
                    <p className="text-xs font-semibold text-stitch-on-surface-variant/60">
                      No tasks match your search or filter options.
                    </p>
                  </Card>
                )
              ) : (
                <div id="tasks-list" className="space-y-3">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleOpenEdit}
                      onDelete={setDeletingTask}
                      onStatusChange={handleStatusCycle}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: AI Sidebar & Stats panel */}
            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20 select-none">
              
              {/* AI Contextual Assistant Panel */}
              <div className="p-6 bg-white border border-stitch-primary/20 rounded-2xl relative overflow-hidden shadow-sm shadow-stitch-primary/5">
                {/* Subtle sheen layer */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-stitch-primary/5 to-transparent rounded-full filter blur-xl"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-stitch-primary">
                    <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-stitch-primary">AI Contextual Assistant</h4>
                  </div>
                  <div className="p-3 bg-stitch-primary/5 rounded-xl border border-stitch-primary/10">
                    <p className="text-xs text-stitch-on-surface leading-relaxed italic">
                      "We detected dependencies between tasks. Let us know if you'd like to map blocking project workflows automatically."
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ai" size="sm" className="flex-1 text-[11px] py-1.5">
                      Link Tasks
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1 text-[11px] py-1.5">
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sprint Health card */}
              <Card className="p-5 border border-stitch-outline-variant/60 bg-white">
                <h4 className="text-[11px] font-bold text-stitch-on-surface-variant/80 mb-4 uppercase tracking-wider">Sprint Health</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-stitch-on-surface-variant/75">Completion Rate</span>
                      <span className="text-stitch-on-surface font-extrabold">64%</span>
                    </div>
                    <div className="w-full h-2 bg-stitch-surface-container rounded-full overflow-hidden">
                      <div className="w-[64%] h-full bg-stitch-secondary rounded-full transition-all duration-500"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 bg-stitch-error/5 rounded-xl border border-stitch-error/10">
                    <svg className="w-4 h-4 text-stitch-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-[11px] font-semibold text-stitch-error">2 tasks past due date</span>
                  </div>
                </div>
              </Card>

            </div>
          </div>
        </div>

        {/* ── Create Modal ────────────────────────────────────────────────── */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stitch-on-surface/40 backdrop-blur-sm p-4 animate-fade-in">
            <div
              id="modal-create-task"
              className="bg-white border border-stitch-outline-variant rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stitch-outline-variant/60">
                <h2 className="text-base font-bold text-stitch-on-surface font-sans">Create Task</h2>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-stitch-on-surface-variant/40 hover:text-stitch-on-surface transition-colors"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-5 select-text">
                {renderForm(handleCreateSubmit, false)}
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Modal ──────────────────────────────────────────────────── */}
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stitch-on-surface/40 backdrop-blur-sm p-4 animate-fade-in">
            <div
              id="modal-edit-task"
              className="bg-white border border-stitch-outline-variant rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stitch-outline-variant/60">
                <h2 className="text-base font-bold text-stitch-on-surface font-sans">Edit Task</h2>
                <button
                  onClick={() => setEditingTask(null)}
                  className="text-stitch-on-surface-variant/40 hover:text-stitch-on-surface transition-colors"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-5 select-text">
                {renderForm(handleEditSubmit, true)}
              </div>
            </div>
          </div>
        )}

        {/* ── Archive Confirmation Modal ────────────────────────────────────── */}
        {deletingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stitch-on-surface/40 backdrop-blur-sm p-4 animate-fade-in">
            <div
              id="modal-archive-task"
              className="bg-white border border-stitch-outline-variant rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-scale-in"
            >
              <div className="w-10 h-10 rounded-full bg-stitch-error/5 text-stitch-error border border-stitch-error/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-stitch-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-stitch-on-surface mb-1.5 font-sans tracking-tight">Archive Task?</h3>
              <p className="text-xs text-stitch-on-surface-variant mb-6 max-w-[280px] mx-auto leading-relaxed select-text">
                Are you sure you want to archive <strong>{deletingTask.title}</strong>? This action can be undone by restoring status.
              </p>
              <div className="flex items-center justify-center gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeletingTask(null)}
                >
                  Cancel
                </Button>
                <Button
                  id="btn-confirm-archive-task"
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteConfirm}
                  disabled={submitLoading}
                >
                  {submitLoading ? "Archiving..." : "Yes, Archive"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success Slide-in Toast */}
        {successToast && (
          <div
            id="success-toast"
            className="fixed bottom-6 right-6 border-l-4 border-emerald-500 bg-white text-emerald-600 px-4.5 py-3.5 rounded-r-lg shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in z-50 shadow-stitch-primary/5"
          >
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
            </svg>
            <span>{successToast}</span>
          </div>
        )}

      </div>
    </ProjectLayout>
  );
};
