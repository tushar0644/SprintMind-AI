import React from "react";
import { Task, TaskStatus, TaskPriority } from "../types";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-zinc-800/60 text-zinc-400 border-zinc-700/40",
  in_progress: "bg-indigo-600/10 text-indigo-400 border-indigo-500/20",
  done: "bg-emerald-600/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-600/10 text-red-400 border-red-500/20",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "text-zinc-500",
  medium: "text-yellow-500",
  high: "text-orange-400",
  urgent: "text-red-400",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
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

  return (
    <div
      id={`task-card-${task.id}`}
      className="group flex items-start gap-4 p-4 bg-[#0c0c0e] border border-zinc-900 rounded-xl hover:border-zinc-800 transition-all duration-200 select-none"
    >
      {/* Cycle Status Button */}
      <button
        title={`Mark as ${STATUS_LABELS[nextStatus()]}`}
        onClick={() => onStatusChange(task, nextStatus())}
        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${
          task.status === "done"
            ? "bg-emerald-500/20 border-emerald-500/40"
            : "border-zinc-700 hover:border-indigo-500/50"
        }`}
      >
        {task.status === "done" && (
          <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-medium leading-snug truncate font-sans ${
            task.status === "done" ? "line-through text-zinc-600" : "text-zinc-200"
          }`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border tracking-wide uppercase ${STATUS_STYLES[task.status]}`}
          >
            {STATUS_LABELS[task.status]}
          </span>
          <span className={`text-[9px] font-medium ${PRIORITY_STYLES[task.priority]}`}>
            ↑ {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
        <button
          id={`btn-edit-task-${task.id}`}
          onClick={() => onEdit(task)}
          title="Edit task"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-600/10 transition-all duration-150"
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
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-600/10 transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
