import React, { useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { useTasks } from "../hooks/useTasks";
import { TaskEmptyState } from "../components/TaskEmptyState";
import { TaskCard } from "../components/TaskCard";
import { Task, TaskStatus, TaskPriority } from "../types";
import { useProjects } from "../../projects/hooks/useProjects";

// ─── Skeleton ───────────────────────────────────────────────────────────────

const TaskSkeleton: React.FC = () => (
  <div className="flex items-start gap-4 p-4 bg-[#0c0c0e] border border-zinc-900/60 rounded-xl animate-pulse">
    <div className="mt-0.5 w-4 h-4 rounded border border-zinc-800 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-2/3 bg-zinc-800/60 rounded" />
      <div className="h-2 w-1/2 bg-zinc-800/40 rounded" />
      <div className="flex gap-2 mt-2">
        <div className="h-3.5 w-14 bg-zinc-800/40 rounded" />
        <div className="h-3.5 w-10 bg-zinc-800/30 rounded" />
      </div>
    </div>
  </div>
);

// ─── Status filter tabs ──────────────────────────────────────────────────────

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
    }, 3000);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTaskStatus("todo");
    setPriority("medium");
    setProjectId(selectedProjectId || projects[0]?.id || "");
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
    try {
      await createTask({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        status: taskStatus,
        priority,
      });
      setIsCreateOpen(false);
      triggerToast("Task created successfully!");
    } catch (err: any) {
      setFormError(err.message || "Failed to create task.");
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

  const filteredTasks = statusFilter === "all"
    ? tasks
    : tasks.filter((t) => t.status === statusFilter);

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  // ── Shared form JSX ──────────────────────────────────────────────────────

  const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit = false) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Project selector — only on create */}
      {!isEdit && (
        <div>
          <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Project <span className="text-red-400">*</span>
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-[#09090b] border border-zinc-800 text-xs text-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          >
            <option value="">Select a project…</option>
            {projects.filter((p) => p.status === "active").map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. Implement JWT middleware"
          className="w-full bg-[#09090b] border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Optional task details…"
          className="w-full bg-[#09090b] border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none"
        />
      </div>

      {/* Status + Priority row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Status
          </label>
          <select
            value={taskStatus}
            onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
            className="w-full bg-[#09090b] border border-zinc-800 text-xs text-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full bg-[#09090b] border border-zinc-800 text-xs text-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Form error */}
      {formError && (
        <p className="text-[10px] text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => { setIsCreateOpen(false); setEditingTask(null); }}
          className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-all duration-150"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitLoading}
          className="px-4 py-2 text-xs font-semibold text-zinc-50 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLoading ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
        </button>
      </div>
    </form>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ProjectLayout>
      <div className="px-8 py-8 max-w-4xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-bold text-zinc-100 tracking-tight font-sans">Tasks</h1>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {loading ? "Loading…" : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} total`}
            </p>
          </div>
          <button
            id="btn-create-task"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-zinc-50 text-xs font-semibold rounded-lg shadow hover:shadow-indigo-500/10 transition-all duration-200 border border-indigo-500/10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>

        {/* Stats Strip */}
        {!loading && tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "To Do", value: todoCount, color: "text-zinc-400" },
              { label: "In Progress", value: inProgressCount, color: "text-indigo-400" },
              { label: "Done", value: doneCount, color: "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0c0c0e] border border-zinc-900 rounded-xl px-4 py-3">
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Project Filter + Status Filter row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Project filter */}
          {projects.length > 0 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[#0c0c0e] border border-zinc-800 text-[10px] font-medium text-zinc-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-[#0c0c0e] border border-zinc-900 rounded-lg p-0.5">
            {STATUSES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-semibold transition-all duration-150 ${
                  statusFilter === value
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Global API Error Banner */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-xl flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-[10px] text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-zinc-600 hover:text-zinc-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Task List */}
        {loading ? (
          <div id="tasks-loading-skeleton" className="space-y-2">
            {[...Array(4)].map((_, i) => <TaskSkeleton key={i} />)}
          </div>
        ) : filteredTasks.length === 0 ? (
          tasks.length === 0 ? (
            <TaskEmptyState onCreateClick={handleOpenCreate} />
          ) : (
            <div className="text-center py-16 text-xs text-zinc-500">
              No tasks match the current filter.
            </div>
          )
        ) : (
          <div id="tasks-list" className="space-y-2">
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

      {/* ── Create Modal ────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            id="modal-create-task"
            className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-md"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-900/60">
              <h2 className="text-sm font-bold text-zinc-100 font-sans">Create Task</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              {renderForm(handleCreateSubmit, false)}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            id="modal-edit-task"
            className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-md"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-900/60">
              <h2 className="text-sm font-bold text-zinc-100 font-sans">Edit Task</h2>
              <button
                onClick={() => setEditingTask(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              {renderForm(handleEditSubmit, true)}
            </div>
          </div>
        </div>
      )}

      {/* ── Archive Confirm Modal ─────────────────────────────────────────── */}
      {deletingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div
            id="modal-archive-task"
            className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-sm p-6 text-center animate-scale-in"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/5 text-red-500 border border-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-1.5 font-sans tracking-tight">Archive Task?</h3>
            <p className="text-xs text-zinc-500 mb-6 max-w-[280px] mx-auto leading-relaxed">
              Are you sure you want to archive <strong>{deletingTask.title}</strong>? This action can be undone by restoring status.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingTask(null)}
                className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-archive-task"
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-zinc-50 text-xs font-semibold rounded-lg shadow-lg hover:shadow-red-500/10 transition-all duration-200 border border-red-500/10"
              >
                {submitLoading ? "Archiving..." : "Yes, Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned Success Toast (Slide-in left accent) */}
      {successToast && (
        <div 
          id="success-toast"
          className="fixed bottom-6 right-6 border-l-4 border-emerald-500 bg-[#0c0c0e] text-emerald-400 px-4.5 py-3.5 rounded-r-lg shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in z-50 shadow-black/40"
        >
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
          </svg>
          <span>{successToast}</span>
        </div>
      )}
    </ProjectLayout>
  );
};
