import React, { useState, useMemo, useEffect } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { useTasks } from "../hooks/useTasks";
import { TaskEmptyState } from "../components/TaskEmptyState";
import { TaskCard } from "../components/TaskCard";
import { Task, TaskStatus, TaskPriority } from "../types";
import { useProjects } from "../../projects/hooks/useProjects";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/Badge";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Plus,
  Search,
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  LayoutGrid,
  List,
  ChevronDown,
  Trash2,
  X,
  Kanban
} from "lucide-react";

// ─── Skeleton ───────────────────────────────────────────────────────────────

const TaskSkeleton: React.FC = () => (
  <Card className="flex items-start gap-4 p-4.5 bg-white border border-stitch-outline-variant/60 rounded-2xl animate-pulse select-none">
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

// Simulated assignee name resolver from task ID
const getTaskAssigneeName = (taskId: string): string => {
  const names = ["John Doe", "Sarah Miller", "Alex Lim", "Patricia May", "Kevin Smith", "Tony Stark"];
  const safeId = taskId || "default";
  const charCodeSum = safeId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return names[charCodeSum % names.length];
};

const getTaskDueDate = (createdAtStr: string): Date => {
  const createdDate = new Date(createdAtStr);
  return new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
};

// Kanban Columns config
const KANBAN_COLUMNS: { id: TaskStatus; label: string; color: string; border: string; bg: string }[] = [
  { id: "todo", label: "To Do", color: "text-zinc-500", border: "border-t-4 border-t-zinc-300", bg: "bg-zinc-50/50" },
  { id: "in_progress", label: "In Progress", color: "text-amber-600", border: "border-t-4 border-t-amber-500", bg: "bg-amber-50/10" },
  { id: "done", label: "Done", color: "text-emerald-600", border: "border-t-4 border-t-emerald-500", bg: "bg-emerald-50/10" },
  { id: "cancelled", label: "Cancelled", color: "text-rose-600", border: "border-t-4 border-t-rose-500", bg: "bg-rose-50/10" }
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

  // Local state for optimistic updates
  const [localTasks, setLocalTasks] = useState<Task[]>([]);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [projectId, setProjectId] = useState("");

  // Advanced Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [dueDateFilter, setDueDateFilter] = useState<"all" | "today" | "this_week" | "overdue">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // Sorting
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "updated" | "created" | "alpha">("created");

  // Layout View Switcher (Card vs. List/Table vs. Board) persisted in localStorage
  const [viewLayout, setViewLayout] = useState<"card" | "list" | "board">(() => {
    return (localStorage.getItem("tasks-view-layout") as "card" | "list" | "board") || "card";
  });

  // Bulk Selection State
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Toast UI state
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const toastTimeoutRef = React.useRef<any>(null);

  useEffect(() => {
    localStorage.setItem("tasks-view-layout", viewLayout);
  }, [viewLayout]);

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
      setSelectedTaskIds(prev => prev.filter(id => id !== deletingTask.id));
    } catch {
      setError("Failed to archive task.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatusCycle = async (task: Task, newStatus: TaskStatus) => {
    // Optimistically update
    const previous = [...localTasks];
    setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await updateTask(task.id, { status: newStatus });
    } catch {
      setLocalTasks(previous);
      setError("Failed to update status.");
    }
  };

  // Drag and drop end callback
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;

    // Save state for rollback
    const previousTasks = [...localTasks];

    // Optimistically update status
    setLocalTasks(prev =>
      prev.map(t => t.id === draggableId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t)
    );

    try {
      await updateTask(draggableId, { status: newStatus });
      triggerToast("Task status updated!");
    } catch (err) {
      setLocalTasks(previousTasks);
      setError("Failed to update task status.");
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = async (status: TaskStatus) => {
    setSubmitLoading(true);
    try {
      for (const id of selectedTaskIds) {
        await updateTask(id, { status });
      }
      setSelectedTaskIds([]);
      triggerToast("Selected tasks updated successfully!");
    } catch {
      setError("Failed to batch update task statuses.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBulkPriorityChange = async (priorityVal: TaskPriority) => {
    setSubmitLoading(true);
    try {
      for (const id of selectedTaskIds) {
        await updateTask(id, { priority: priorityVal });
      }
      setSelectedTaskIds([]);
      triggerToast("Selected tasks updated successfully!");
    } catch {
      setError("Failed to batch update task priorities.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setSubmitLoading(true);
    try {
      for (const id of selectedTaskIds) {
        await deleteTask(id);
      }
      setSelectedTaskIds([]);
      triggerToast("Selected tasks archived successfully!");
    } catch {
      setError("Failed to archive selected tasks.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSelectAllToggle = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    }
  };

  const handleTaskSelectToggle = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    } else {
      setSelectedTaskIds(prev => [...prev, taskId]);
    }
  };

  // Filter Combinations
  const filteredTasks = useMemo(() => {
    return localTasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
      
      let matchesDueDate = true;
      if (dueDateFilter === "today") {
        matchesDueDate = getTaskDueDate(t.created_at).toDateString() === new Date().toDateString();
      } else if (dueDateFilter === "this_week") {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const taskDue = getTaskDueDate(t.created_at);
        matchesDueDate = taskDue >= new Date() && taskDue <= nextWeek;
      } else if (dueDateFilter === "overdue") {
        matchesDueDate = (t.status !== "done" && t.status !== "cancelled") && getTaskDueDate(t.created_at) < new Date();
      }

      const matchesAssignee = assigneeFilter === "all" || getTaskAssigneeName(t.id) === assigneeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesDueDate && matchesAssignee;
    });
  }, [localTasks, searchQuery, statusFilter, priorityFilter, dueDateFilter, assigneeFilter]);

  // Sorting
  const sortedTasks = useMemo(() => {
    const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
    
    return [...filteredTasks].sort((a, b) => {
      switch (sortBy) {
        case "due_date":
          return getTaskDueDate(a.created_at).getTime() - getTaskDueDate(b.created_at).getTime();
        case "priority":
          return priorityWeights[b.priority] - priorityWeights[a.priority];
        case "updated":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case "alpha":
          return a.title.localeCompare(b.title);
        case "created":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [filteredTasks, sortBy]);

  // Active filter indicators count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (priorityFilter !== "all") count++;
    if (dueDateFilter !== "all") count++;
    if (assigneeFilter !== "all") count++;
    if (selectedProjectId !== "") count++;
    if (searchQuery !== "") count++;
    return count;
  }, [statusFilter, priorityFilter, dueDateFilter, assigneeFilter, selectedProjectId, searchQuery]);

  const clearAllFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setDueDateFilter("all");
    setAssigneeFilter("all");
    setSelectedProjectId("");
    setSearchQuery("");
  };

  // Stats Card Calculations
  const totalTasks = localTasks.length;
  const todoCount = localTasks.filter((t) => t.status === "todo").length;
  const inProgressCount = localTasks.filter((t) => t.status === "in_progress").length;
  const doneCount = localTasks.filter((t) => t.status === "done").length;
  const overdueCount = localTasks.filter((t) => (t.status !== "done" && t.status !== "cancelled") && getTaskDueDate(t.created_at) < new Date()).length;
  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  // Form render helper
  const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit = false) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {!isEdit && (
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
            Project <span className="text-stitch-error">*</span>
          </label>
          <div className="relative">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
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
      )}

      <Input
        label="Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="e.g. Implement JWT middleware"
      />

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
          className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 resize-none select-text"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
            Status
          </label>
          <div className="relative">
            <select
              value={taskStatus}
              onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface focus:outline-none focus:ring-2"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
            Priority
          </label>
          <div className="relative">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm text-stitch-on-surface focus:outline-none focus:ring-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
          </div>
        </div>
      </div>

      {formError && (
        <p className="text-[11px] font-semibold text-stitch-error bg-stitch-error/5 border border-stitch-error/10 rounded-xl px-3 py-2 select-none">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2.5 pt-2 border-t border-stitch-outline-variant/60">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => { setIsCreateOpen(false); setEditingTask(null); }}
          className="rounded-xl font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={submitLoading}
          className="rounded-xl font-semibold shadow-sm"
        >
          {submitLoading ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
        </Button>
      </div>
    </form>
  );

  return (
    <ProjectLayout>
      <div className="space-y-8 max-w-6xl mx-auto px-4 md:px-6 py-6 min-h-screen relative text-stitch-on-surface select-none">
        
        {/* Success Toast */}
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

        {/* ── Header ────────────────────────────────────────── */}
        <section className="flex flex-col md:flex-row md:items-center justify-between border-b border-stitch-outline-variant/50 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-stitch-on-surface font-sans">Tasks</h1>
              <Badge variant="neutral" className="rounded-lg text-[10px] font-bold">
                {totalTasks} Total
              </Badge>
            </div>
            <p className="text-xs text-stitch-on-surface-variant mt-1.5 leading-relaxed">
              {loading ? "Loading…" : `${totalTasks} tasks total`}
            </p>
            
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] text-stitch-on-surface-variant font-semibold">Active filters:</span>
                {statusFilter !== "all" && <Badge variant="secondary" className="normal-case text-[9px] font-bold">Status: {statusFilter}</Badge>}
                {priorityFilter !== "all" && <Badge variant="secondary" className="normal-case text-[9px] font-bold">Priority: {priorityFilter}</Badge>}
                {dueDateFilter !== "all" && <Badge variant="secondary" className="normal-case text-[9px] font-bold">Due: {dueDateFilter}</Badge>}
                {assigneeFilter !== "all" && <Badge variant="secondary" className="normal-case text-[9px] font-bold">Assignee: {assigneeFilter}</Badge>}
                {selectedProjectId !== "" && <Badge variant="secondary" className="normal-case text-[9px] font-bold">Project filtered</Badge>}
                {searchQuery !== "" && <Badge variant="secondary" className="normal-case text-[9px] font-bold">Query: {searchQuery}</Badge>}
                <button
                  onClick={clearAllFilters}
                  className="text-[10px] text-stitch-primary font-bold hover:underline ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* View switcher supporting Card vs. List vs. Kanban Board */}
            <div className="flex items-center bg-stitch-surface-container/20 border border-stitch-outline-variant/60 rounded-xl p-1 shrink-0 shadow-sm">
              <button
                onClick={() => setViewLayout("card")}
                className={`p-1.5 rounded-lg transition-all ${viewLayout === "card" ? "bg-white text-stitch-primary shadow-sm border border-stitch-outline-variant/40" : "text-stitch-on-surface-variant/70 hover:text-stitch-on-surface"}`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout("list")}
                className={`p-1.5 rounded-lg transition-all ${viewLayout === "list" ? "bg-white text-stitch-primary shadow-sm border border-stitch-outline-variant/40" : "text-stitch-on-surface-variant/70 hover:text-stitch-on-surface"}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout("board")}
                className={`p-1.5 rounded-lg transition-all ${viewLayout === "board" ? "bg-white text-stitch-primary shadow-sm border border-stitch-outline-variant/40" : "text-stitch-on-surface-variant/70 hover:text-stitch-on-surface"}`}
                title="Kanban Board View"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>

            <Button
              id="btn-create-task"
              onClick={handleOpenCreate}
              variant="primary"
              size="sm"
              className="flex items-center gap-2 select-none shrink-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </Button>
          </div>
        </section>

        {/* ── KPI metrics cards ──────────────────────────────── */}
        {!loading && tasks.length > 0 && (
          <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Tasks", value: totalTasks, icon: CheckSquare, color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
              { label: "To Do", value: todoCount, icon: Clock, color: "bg-zinc-50 text-zinc-600 border-zinc-100" },
              { label: "In Progress", value: inProgressCount, icon: Clock, color: "bg-amber-50 text-amber-600 border-amber-100 animate-pulse-slow" },
              { label: "Done", value: doneCount, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
              { label: "Overdue", value: overdueCount, icon: AlertCircle, color: "bg-rose-50 text-rose-600 border-rose-100" },
              { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, color: "bg-purple-50 text-purple-600 border-purple-100" }
            ].map((stat, idx) => (
              <Card
                key={idx}
                className="flex items-center gap-3.5 p-4.5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300"
              >
                <div className={`p-2.5 rounded-xl border ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-extrabold tracking-wider text-stitch-on-surface-variant/70">{stat.label}</p>
                  <p className="text-lg font-black text-stitch-on-surface mt-0.5 tracking-tight">{stat.value}</p>
                </div>
              </Card>
            ))}
          </section>
        )}

        {/* ── Filter bar & Sorting ──────────────── */}
        <section className="flex flex-col gap-4 p-4.5 bg-stitch-surface-container/20 border border-stitch-outline-variant/50 rounded-2xl">
          {/* Status Filter Tab Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 select-none">
            {[
              { id: "all", label: "All" },
              { id: "todo", label: "To Do" },
              { id: "in_progress", label: "In Progress" },
              { id: "done", label: "Done" },
              { id: "cancelled", label: "Cancelled" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-stitch-primary/10 text-stitch-primary border border-stitch-primary/15"
                    : "bg-white text-stitch-on-surface-variant hover:bg-stitch-surface-container/50 border border-stitch-outline-variant"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full lg:flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-stitch-on-surface-variant/60">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-9 pr-4 py-2 text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all duration-200"
              />
            </div>

            {/* Multiple selects selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full lg:w-auto">
              
              {/* Project Select */}
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface font-semibold focus:outline-none select-none appearance-none"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>

              {/* Status Select */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface font-semibold focus:outline-none select-none appearance-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>

              {/* Priority Select */}
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface font-semibold focus:outline-none select-none appearance-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>

              {/* Due Date Select */}
              <div className="relative">
                <select
                  value={dueDateFilter}
                  onChange={(e) => setDueDateFilter(e.target.value as any)}
                  className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface font-semibold focus:outline-none select-none appearance-none"
                >
                  <option value="all">All Due Dates</option>
                  <option value="today">Due Today</option>
                  <option value="this_week">Due This Week</option>
                  <option value="overdue">Overdue Tasks</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>

              {/* Assignee Select */}
              <div className="relative">
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface font-semibold focus:outline-none select-none appearance-none"
                >
                  <option value="all">All Assignees</option>
                  {["John Doe", "Sarah Miller", "Alex Lim", "Patricia May", "Kevin Smith", "Tony Stark"].map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>

            </div>
          </div>

          {/* Sorting controls */}
          <div className="border-t border-stitch-outline-variant/30 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">Sort by</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-1.5 text-xs text-stitch-on-surface focus:outline-none select-none appearance-none font-semibold shadow-sm"
                >
                  <option value="created">Recently Created</option>
                  <option value="updated">Recently Updated</option>
                  <option value="due_date">Due Date</option>
                  <option value="priority">Priority Weight</option>
                  <option value="alpha">Alphabetical</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>
            </div>

            {/* Select All Checkbox Helper */}
            {sortedTasks.length > 0 && viewLayout !== "board" && (
              <button
                onClick={handleSelectAllToggle}
                className="text-[10px] text-stitch-primary font-bold hover:underline flex items-center gap-1.5"
              >
                <input
                  type="checkbox"
                  checked={selectedTaskIds.length === sortedTasks.length && sortedTasks.length > 0}
                  onChange={handleSelectAllToggle}
                  className="w-3 h-3 rounded text-stitch-primary"
                  readOnly
                />
                <span>Select All ({selectedTaskIds.length}/{sortedTasks.length})</span>
              </button>
            )}
          </div>
        </section>

        {/* Global Error Banner */}
        {error && (
          <div className="px-4 py-3.5 bg-stitch-error/5 border border-stitch-error/15 rounded-2xl flex items-center gap-2.5 animate-fade-in shadow-sm select-none">
            <AlertCircle className="w-4 h-4 text-stitch-error shrink-0" />
            <p className="text-xs font-semibold text-stitch-error">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-stitch-on-surface-variant/40 hover:text-stitch-on-surface transition-colors font-bold">✕</button>
          </div>
        )}

        {/* ── Main View Area ──────────────────────────────── */}
        <section className="min-h-[400px]">
          {loading ? (
            <div id="tasks-loading-skeleton" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => <TaskSkeleton key={i} />)}
            </div>
          ) : sortedTasks.length === 0 ? (
            tasks.length === 0 ? (
              <TaskEmptyState onCreateClick={handleOpenCreate} />
            ) : (
              <Card className="text-center py-20 border border-stitch-outline-variant/60 rounded-3xl bg-white select-none">
                <Search className="w-8 h-8 text-stitch-on-surface-variant/30 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-stitch-on-surface mb-1">No tasks matching filters</h3>
                <p className="text-xs text-stitch-on-surface-variant max-w-xs mx-auto leading-relaxed">
                  Try clearing some of your search parameters or select all filters.
                </p>
                <Button onClick={clearAllFilters} variant="secondary" size="sm" className="mt-4 rounded-xl font-bold">
                  Reset Filters
                </Button>
              </Card>
            )
          ) : viewLayout === "card" ? (
            /* Card view */
            <div id="tasks-list" className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              {sortedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleOpenEdit}
                  onDelete={setDeletingTask}
                  onStatusChange={handleStatusCycle}
                  projectName={projects.find((p) => p.id === task.project_id)?.name}
                  isSelected={selectedTaskIds.includes(task.id)}
                  onSelectToggle={() => handleTaskSelectToggle(task.id)}
                />
              ))}
            </div>
          ) : viewLayout === "list" ? (
            /* Table/List view */
            <Card id="tasks-list" className="border-stitch-outline-variant bg-white rounded-2xl overflow-hidden p-0 animate-fade-in shadow-sm select-none">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-stitch-surface-container/20 border-b border-stitch-outline-variant/40 text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.length === sortedTasks.length && sortedTasks.length > 0}
                          onChange={handleSelectAllToggle}
                          className="w-3.5 h-3.5 rounded border-stitch-outline-variant text-stitch-primary"
                        />
                      </th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4 w-28">Status</th>
                      <th className="py-3 px-4 w-28">Priority</th>
                      <th className="py-3 px-4 w-32">Due Date</th>
                      <th className="py-3 px-4 w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stitch-outline-variant/30 text-xs">
                    {sortedTasks.map((t) => {
                      const pName = projects.find((p) => p.id === t.project_id)?.name || "Workspace";
                      const dueDate = getTaskDueDate(t.created_at);

                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-stitch-surface-container/10 transition-colors ${selectedTaskIds.includes(t.id) ? "bg-stitch-primary/5" : ""}`}
                        >
                          <td className="py-2.5 px-4">
                            <input
                              type="checkbox"
                              checked={selectedTaskIds.includes(t.id)}
                              onChange={() => handleTaskSelectToggle(t.id)}
                              className="w-3.5 h-3.5 rounded border-stitch-outline-variant text-stitch-primary"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-bold text-stitch-on-surface truncate max-w-xs">{t.title}</td>
                          <td className="py-2.5 px-4 text-stitch-primary font-bold">{pName}</td>
                          <td className="py-2.5 px-4">
                            <Badge variant={t.status === "done" ? "success" : t.status === "in_progress" ? "secondary" : "neutral"} className="rounded-lg">
                              {t.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge variant={t.priority === "urgent" ? "danger" : t.priority === "high" ? "warning" : "neutral"} className="rounded-lg capitalize">
                              {t.priority}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-stitch-on-surface-variant/70 font-semibold">
                            {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(t)}
                                className="p-1 rounded text-stitch-on-surface-variant hover:text-stitch-primary hover:bg-stitch-surface-container transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeletingTask(t)}
                                className="p-1 rounded text-stitch-error hover:bg-red-50 transition-all font-semibold"
                              >
                                Archive
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* Kanban Board View with Drag and Drop */
            <DragDropContext onDragEnd={handleDragEnd}>
              <div id="tasks-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start overflow-x-auto pb-4 select-none">
                {KANBAN_COLUMNS.map((col) => {
                  const colTasks = sortedTasks.filter((t) => t.status === col.id);
                  const completionPercentage = sortedTasks.length > 0 ? Math.round((colTasks.length / sortedTasks.length) * 100) : 0;

                  return (
                    <div
                      key={col.id}
                      className={`flex flex-col bg-white border border-stitch-outline-variant/60 rounded-2xl p-4 shadow-sm w-full min-w-[250px] ${col.border}`}
                    >
                      {/* Column Header */}
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-stitch-outline-variant/30">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold font-sans ${col.color}`}>
                            {col.label}
                          </span>
                          <span className="bg-stitch-surface-container text-stitch-on-surface-variant px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            {colTasks.length}
                          </span>
                        </div>
                        <span className="text-[10px] text-stitch-on-surface-variant/60 font-semibold">
                          {completionPercentage}% load
                        </span>
                      </div>

                      {/* Scrollable droppable tasks list */}
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex flex-col gap-3 min-h-[400px] max-h-[500px] overflow-y-auto p-1 transition-colors rounded-xl ${
                              snapshot.isDraggingOver ? "bg-stitch-surface-container/20" : ""
                            }`}
                          >
                            {colTasks.map((task, idx) => (
                              <Draggable key={task.id} draggableId={task.id} index={idx}>
                                {(providedDrag, snapshotDrag) => (
                                  <div
                                    ref={providedDrag.innerRef}
                                    {...providedDrag.draggableProps}
                                    {...providedDrag.dragHandleProps}
                                    style={{
                                      ...providedDrag.draggableProps.style,
                                      opacity: snapshotDrag.isDragging ? 0.8 : 1,
                                    }}
                                  >
                                    <TaskCard
                                      task={task}
                                      onEdit={handleOpenEdit}
                                      onDelete={setDeletingTask}
                                      onStatusChange={handleStatusCycle}
                                      projectName={projects.find((p) => p.id === task.project_id)?.name}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          )}
        </section>

        {/* Bulk Actions Panel */}
        {selectedTaskIds.length > 0 && viewLayout !== "board" && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-stitch-outline-variant shadow-2xl rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4 animate-slide-in select-none">
            <span className="text-xs font-bold text-stitch-on-surface-variant/90 border-r border-stitch-outline-variant/60 pr-4">
              {selectedTaskIds.length} tasks selected
            </span>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-stitch-on-surface-variant/60">Status</span>
              <div className="relative">
                <select
                  onChange={(e) => handleBulkStatusChange(e.target.value as TaskStatus)}
                  value=""
                  className="bg-stitch-surface-container/30 border border-stitch-outline-variant rounded-xl px-2.5 py-1 text-xs select-none appearance-none font-bold pr-7"
                >
                  <option value="" disabled>Change Status…</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-stitch-on-surface-variant/60">Priority</span>
              <div className="relative">
                <select
                  onChange={(e) => handleBulkPriorityChange(e.target.value as TaskPriority)}
                  value=""
                  className="bg-stitch-surface-container/30 border border-stitch-outline-variant rounded-xl px-2.5 py-1 text-xs select-none appearance-none font-bold pr-7"
                >
                  <option value="" disabled>Change Priority…</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>
            </div>

            <button
              onClick={handleBulkDelete}
              className="py-1 px-3 bg-red-50 text-stitch-error hover:bg-red-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Archive Selected</span>
            </button>

            <button
              onClick={() => setSelectedTaskIds([])}
              className="text-xs text-stitch-on-surface-variant/60 hover:text-stitch-on-surface font-bold pl-2 border-l border-stitch-outline-variant/60"
            >
              Deselect
            </button>
          </div>
        )}

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
                  <X className="w-5 h-5" />
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
                  <X className="w-5 h-5" />
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
              <div className="w-12 h-12 rounded-full bg-stitch-error/5 text-stitch-error border border-stitch-error/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-stitch-error" />
              </div>
              <h3 className="text-base font-bold text-stitch-on-surface mb-1.5 font-sans tracking-tight">Archive Task?</h3>
              <p className="text-xs text-stitch-on-surface-variant mb-6 max-w-[280px] mx-auto leading-relaxed select-text">
                Are you sure you want to archive <strong>{deletingTask.title}</strong>? This action can be undone by restoring status.
              </p>
              <div className="flex items-center justify-center gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeletingTask(null)}
                  className="rounded-xl font-semibold"
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
                  className="rounded-xl font-semibold bg-stitch-error hover:bg-red-700 text-white"
                >
                  {submitLoading ? "Archiving..." : "Yes, Archive"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProjectLayout>
  );
};
