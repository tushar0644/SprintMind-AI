import React from "react";
import { Sprint } from "../../../types/Sprint";
import { SprintCard } from "./SprintCard";
import { SkeletonLoader } from "./SkeletonLoader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Kanban,
  Zap,
  CheckCircle2,
  ListTodo,
  Layers
} from "lucide-react";

interface SprintBoardProps {
  sprints: Sprint[];
  loading?: boolean;
  error?: string | null;
  onGeneratePlan?: () => void;
  onRetry?: () => void;
}

export const SprintBoard: React.FC<SprintBoardProps> = ({
  sprints,
  loading = false,
  error = null,
  onGeneratePlan,
  onRetry
}) => {
  // Compute overall board summary metrics
  const totalSprints = sprints.length;
  const totalPoints = sprints.reduce((acc, s) => acc + (s.total_points || 0), 0);
  const totalTasks = sprints.reduce((acc, s) => acc + (s.tasks?.length || 0), 0);
  const completedTasks = sprints.reduce(
    (acc, s) => acc + (s.tasks?.filter((t) => t.status === "done").length || 0),
    0
  );
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 1. Loading State: Skeleton loaders
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-stitch-outline-variant/40 pb-4">
          <div className="h-5 bg-stitch-surface-container rounded w-48 animate-pulse" />
          <div className="h-4 bg-stitch-surface-container rounded w-24 animate-pulse" />
        </div>
        <SkeletonLoader />
      </div>
    );
  }

  // 2. Error State: Retry button
  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center text-center p-8 bg-red-50/30 border border-red-200/70 rounded-3xl max-w-lg mx-auto my-8 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 text-stitch-error flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-base font-bold text-stitch-on-surface mb-1.5 font-sans">
          Failed to Load Sprint Plan
        </h3>
        <p className="text-xs text-stitch-on-surface-variant max-w-sm mb-6 leading-relaxed">
          {error}
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 bg-white border border-stitch-outline-variant hover:bg-zinc-50 rounded-xl font-bold text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Operation</span>
          </Button>
        )}
      </Card>
    );
  }

  // 3. Empty State: "No Sprint Plan Generated"
  if (totalSprints === 0) {
    return (
      <Card className="flex flex-col items-center justify-center text-center p-12 bg-white border border-stitch-outline-variant/60 rounded-3xl max-w-xl mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
          <Kanban className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-extrabold text-stitch-on-surface mb-2 font-sans tracking-tight">
          No Sprint Plan Generated
        </h3>
        <p className="text-xs text-stitch-on-surface-variant max-w-md mb-6 leading-relaxed font-sans">
          Prioritize project tasks into balanced, sequential sprints bounded by story-point capacity and dependency order automatically.
        </p>
        {onGeneratePlan && (
          <Button
            onClick={onGeneratePlan}
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 flex items-center gap-2 font-bold text-xs shadow-md shadow-indigo-100 transition-all duration-200"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Sprint Plan</span>
          </Button>
        )}
      </Card>
    );
  }

  // 4. Active Sprint Board State
  return (
    <div className="space-y-6">
      {/* Overview Statistics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-stitch-outline-variant/60 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">
              Total Sprints
            </p>
            <p className="text-base font-extrabold text-stitch-on-surface mt-0.5">
              {totalSprints}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">
              Total Points
            </p>
            <p className="text-base font-extrabold text-stitch-on-surface mt-0.5">
              {totalPoints} pts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <ListTodo className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">
              Scheduled Tasks
            </p>
            <p className="text-base font-extrabold text-stitch-on-surface mt-0.5">
              {totalTasks}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-stitch-on-surface-variant/70">
              Overall Progress
            </p>
            <p className="text-base font-extrabold text-stitch-on-surface mt-0.5">
              {overallProgress}%
            </p>
          </div>
        </div>
      </div>

      {/* Sprint Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sprints.map((sprint) => (
          <SprintCard key={sprint.id || sprint.sprint_number} sprint={sprint} />
        ))}
      </div>
    </div>
  );
};
