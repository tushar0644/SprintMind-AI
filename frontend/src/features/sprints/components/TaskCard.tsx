import React from "react";
import { SprintTask } from "../../../types/SprintTask";
import { Badge } from "../../../components/ui/Badge";
import { CheckCircle2, Circle, GitFork, Hash } from "lucide-react";

interface TaskCardProps {
  task: SprintTask;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const isCompleted = task.status === "done";

  const getPriorityVariant = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "primary";
      case "low":
      default:
        return "neutral";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "done":
        return <Badge variant="success" className="text-[9px] uppercase px-2 py-0.5 font-bold">Done</Badge>;
      case "in_progress":
        return <Badge variant="primary" className="text-[9px] uppercase px-2 py-0.5 font-bold">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="neutral" className="text-[9px] uppercase px-2 py-0.5 font-bold">Cancelled</Badge>;
      case "todo":
      default:
        return <Badge variant="neutral" className="text-[9px] uppercase px-2 py-0.5 font-bold">To Do</Badge>;
    }
  };

  return (
    <div
      className={`p-3.5 bg-white border rounded-xl transition-all duration-200 hover:shadow-sm flex flex-col gap-2.5 ${
        isCompleted
          ? "border-emerald-200/80 bg-emerald-50/20"
          : "border-stitch-outline-variant/60 hover:border-stitch-primary/30"
      }`}
    >
      {/* Top Header: Title & Status Indicator */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 shrink-0">
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <Circle className="w-4 h-4 text-stitch-on-surface-variant/40" />
            )}
          </div>
          <h4
            className={`text-xs font-semibold tracking-tight leading-snug line-clamp-2 ${
              isCompleted
                ? "line-through text-stitch-on-surface-variant/70"
                : "text-stitch-on-surface"
            }`}
          >
            {task.title}
          </h4>
        </div>
      </div>

      {/* Description if present */}
      {task.description && (
        <p className="text-[11px] text-stitch-on-surface-variant/80 line-clamp-2 pl-6 leading-relaxed font-sans">
          {task.description}
        </p>
      )}

      {/* Footer Badges & Metadata */}
      <div className="flex items-center justify-between border-t border-stitch-outline-variant/30 pt-2.5 mt-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Priority Badge */}
          <Badge
            variant={getPriorityVariant(task.priority)}
            className="text-[9px] uppercase px-2 py-0.5 font-bold"
          >
            {task.priority || "medium"}
          </Badge>

          {/* Status Badge */}
          {getStatusBadge(task.status)}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-semibold text-stitch-on-surface-variant">
          {/* Dependency Icon & Indicator */}
          {task.depends_on && task.depends_on.length > 0 && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md"
              title={`Depends on ${task.depends_on.length} prerequisite task(s)`}
            >
              <GitFork className="w-3 h-3 text-amber-600" />
              <span>{task.depends_on.length}</span>
            </div>
          )}

          {/* Story Points */}
          <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-extrabold">
            <Hash className="w-2.5 h-2.5 text-indigo-500" />
            <span>{task.story_points ?? 1} pts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
