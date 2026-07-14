import React from "react";
import { Task, TaskStatus, TaskPriority } from "../types";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

const STATUS_BADGE_VARIANTS: Record<TaskStatus, "neutral" | "secondary" | "success" | "danger"> = {
  todo: "neutral",
  in_progress: "secondary",
  done: "success",
  cancelled: "danger",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_BADGE_VARIANTS: Record<TaskPriority, "neutral" | "warning" | "danger"> = {
  low: "neutral",
  medium: "warning",
  high: "warning",
  urgent: "danger",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const BORDER_LEFT_STYLES: Record<TaskStatus, string> = {
  todo: "border-l-4 border-l-stitch-outline-variant/60",
  in_progress: "border-l-4 border-l-stitch-secondary",
  done: "border-l-4 border-l-emerald-500",
  cancelled: "border-l-4 border-l-stitch-error",
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const nextStatus = (): TaskStatus => {
    const cycle: TaskStatus[] = ["todo", "in_progress", "done"];
    const idx = cycle.indexOf(task.status);
    return cycle[(idx + 1) % cycle.length];
  };

  // Mock due date (creation date + 7 days)
  const getMockDueDate = (createdAtStr: string) => {
    try {
      const createdDate = new Date(createdAtStr);
      const dueDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    } catch {
      return "Oct 24, 2023";
    }
  };

  // Dynamic user assignee initials and gradient avatar
  const getAssignee = (taskId: string) => {
    const charCodeSum = taskId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const names = ["John Doe", "Sarah Miller", "Alex Lim", "Patricia May", "Kevin Smith", "Tony Stark"];
    const initials = ["JD", "SM", "AL", "PM", "KS", "TS"];
    const idx = charCodeSum % names.length;
    const gradients = [
      "from-blue-400 to-indigo-500",
      "from-purple-400 to-pink-500",
      "from-emerald-400 to-teal-500",
      "from-amber-400 to-orange-500",
      "from-cyan-400 to-blue-500",
      "from-rose-400 to-red-500",
    ];
    const gradient = gradients[charCodeSum % gradients.length];
    return { name: names[idx], initials: initials[idx], gradient };
  };

  const assignee = getAssignee(task.id);
  const dueDate = getMockDueDate(task.created_at);

  return (
    <Card
      id={`task-card-${task.id}`}
      hoverable={true}
      className={`group flex items-start gap-4 p-4 ${BORDER_LEFT_STYLES[task.status]} hover:border-stitch-outline/30 transition-all duration-200 select-none bg-white`}
    >
      {/* Cycle Status Checkbox Button */}
      <button
        title={`Mark as ${STATUS_LABELS[nextStatus()]}`}
        onClick={() => onStatusChange(task, nextStatus())}
        className={`mt-1 w-4.5 h-4.5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-150 ${
          task.status === "done"
            ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-sm"
            : "border-stitch-outline-variant hover:border-stitch-primary hover:bg-stitch-primary/5 text-transparent"
        }`}
      >
        <svg className={`w-2.5 h-2.5 ${task.status === "done" ? "opacity-100" : "opacity-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </button>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <p
            className={`text-xs font-semibold leading-snug truncate font-sans ${
              task.status === "done" ? "line-through text-stitch-on-surface-variant/40" : "text-stitch-on-surface"
            }`}
          >
            {task.title}
          </p>
          {/* Due Date Display */}
          <div className="flex items-center gap-1 text-[10px] text-stitch-on-surface-variant/60 shrink-0 font-medium select-none">
            <svg className="w-3.5 h-3.5 text-stitch-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{dueDate}</span>
          </div>
        </div>

        {task.description && (
          <p className="text-[10px] text-stitch-on-surface-variant/70 mt-1 line-clamp-1 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Badges & Assignee Row */}
        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={STATUS_BADGE_VARIANTS[task.status]}>
              {STATUS_LABELS[task.status]}
            </Badge>
            <Badge variant={PRIORITY_BADGE_VARIANTS[task.priority]} className="capitalize">
              ↑ {PRIORITY_LABELS[task.priority]}
            </Badge>
          </div>

          {/* Assignee Avatar */}
          <div 
            title={`Assigned to ${assignee.name}`}
            className={`w-6 h-6 rounded-full bg-gradient-to-br ${assignee.gradient} flex items-center justify-center text-[9px] font-bold text-white border border-white shadow-sm shrink-0`}
          >
            {assignee.initials}
          </div>
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 shrink-0 select-none">
        <button
          id={`btn-edit-task-${task.id}`}
          onClick={() => onEdit(task)}
          title="Edit task"
          className="p-1.5 rounded-stitch text-stitch-on-surface-variant/60 hover:text-stitch-primary hover:bg-stitch-primary/10 transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <button
          id={`btn-archive-task-${task.id}`}
          onClick={() => onDelete(task)}
          title="Archive Task"
          className="p-1.5 rounded-stitch text-stitch-on-surface-variant/60 hover:text-stitch-error hover:bg-stitch-error/10 transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </Card>
  );
};
