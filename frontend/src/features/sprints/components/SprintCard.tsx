import React from "react";
import { Sprint } from "../../../types/Sprint";
import { TaskCard } from "./TaskCard";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { CheckSquare, Layers, Gauge } from "lucide-react";

interface SprintCardProps {
  sprint: Sprint;
}

export const SprintCard: React.FC<SprintCardProps> = ({ sprint }) => {
  const totalTasks = sprint.tasks?.length || 0;
  const completedTasks = sprint.tasks?.filter((t) => t.status === "done").length || 0;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const capacityPercentage =
    sprint.capacity > 0
      ? Math.min(Math.round((sprint.total_points / sprint.capacity) * 100), 100)
      : 0;

  return (
    <Card className="bg-white border border-stitch-outline-variant/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4">
      <div className="space-y-4">
        {/* Header: Sprint Title & Badges */}
        <div className="flex items-center justify-between border-b border-stitch-outline-variant/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
              #{sprint.sprint_number}
            </div>
            <div>
              <h3 className="text-sm font-bold text-stitch-on-surface tracking-tight font-sans">
                {sprint.name || `Sprint ${sprint.sprint_number}`}
              </h3>
              <p className="text-[10px] text-stitch-on-surface-variant font-medium">
                Sprint #{sprint.sprint_number}
              </p>
            </div>
          </div>

          <Badge
            variant={
              sprint.status === "active"
                ? "success"
                : sprint.status === "completed"
                ? "primary"
                : "neutral"
            }
            className="text-[9px] uppercase px-2 py-0.5 font-bold"
          >
            {sprint.status || "planned"}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 bg-stitch-surface-container/20 p-3 rounded-2xl border border-stitch-outline-variant/30">
          {/* Capacity Metric */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-stitch-on-surface-variant">
              <Gauge className="w-3 h-3 text-indigo-500" />
              <span>Capacity</span>
            </div>
            <p className="text-xs font-extrabold text-stitch-on-surface">
              {sprint.total_points} / {sprint.capacity} <span className="text-[10px] font-normal text-stitch-on-surface-variant">pts</span>
            </p>
            <div className="w-full h-1 bg-stitch-surface-container rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  capacityPercentage >= 90 ? "bg-amber-500" : "bg-indigo-500"
                }`}
                style={{ width: `${capacityPercentage}%` }}
              />
            </div>
          </div>

          {/* Completion Metric */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-stitch-on-surface-variant">
              <CheckSquare className="w-3 h-3 text-emerald-500" />
              <span>Completion</span>
            </div>
            <p className="text-xs font-extrabold text-stitch-on-surface">
              {completionPercentage}% <span className="text-[10px] font-normal text-stitch-on-surface-variant">({completedTasks}/{totalTasks})</span>
            </p>
            <div className="w-full h-1 bg-stitch-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task List Header */}
        <div className="flex items-center justify-between text-xs font-bold text-stitch-on-surface pt-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-stitch-primary" />
            <span>Task List</span>
          </div>
          <span className="text-[10px] font-semibold text-stitch-on-surface-variant/80 bg-stitch-surface-container px-2 py-0.5 rounded-full">
            {totalTasks} Task{totalTasks === 1 ? "" : "s"}
          </span>
        </div>

        {/* Task List */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {sprint.tasks && sprint.tasks.length > 0 ? (
            sprint.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          ) : (
            <div className="text-center py-6 border border-dashed border-stitch-outline-variant/60 rounded-xl text-[11px] text-stitch-on-surface-variant/60">
              No tasks assigned to this sprint.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
