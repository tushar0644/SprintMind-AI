import React from "react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

interface TaskEmptyStateProps {
  onCreateClick?: () => void;
}

export const TaskEmptyState: React.FC<TaskEmptyStateProps> = ({ onCreateClick }) => {
  return (
    <Card className="flex flex-col items-center justify-center text-center p-10 max-w-md mx-auto mt-16 animate-fade-in select-none border-stitch-outline-variant/60">
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-stitch-primary/5 text-stitch-primary border border-stitch-primary/10 flex items-center justify-center mb-5 shadow-sm shadow-stitch-primary/5">
        <svg className="w-5 h-5 text-stitch-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </div>

      <h3 className="text-sm font-semibold text-stitch-on-surface mb-1.5 font-sans tracking-tight">
        No tasks yet
      </h3>
      <p className="text-xs text-stitch-on-surface-variant mb-6 max-w-xs leading-relaxed font-sans">
        Break your project into actionable tasks. Track progress by status, set priorities, and move work forward.
      </p>

      <Button
        id="btn-create-task-empty-trigger"
        onClick={onCreateClick}
        variant="primary"
        size="sm"
        className="flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Create Task</span>
      </Button>
    </Card>
  );
};
