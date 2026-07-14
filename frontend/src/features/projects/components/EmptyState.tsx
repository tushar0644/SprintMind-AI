import React from "react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

interface EmptyStateProps {
  onCreateClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick }) => {
  return (
    <Card className="flex flex-col items-center justify-center text-center p-10 max-w-md mx-auto mt-16 animate-fade-in select-none bg-white border-stitch-outline-variant shadow-sm">
      {/* Premium minimal outline graphic */}
      <div className="w-12 h-12 rounded-full bg-stitch-primary/10 text-stitch-primary border border-stitch-primary/15 flex items-center justify-center mb-5 shadow-sm">
        <svg className="w-5 h-5 text-stitch-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      </div>

      <h3 className="text-sm font-semibold text-stitch-on-surface mb-1.5 font-sans tracking-tight">No projects found</h3>
      <p className="text-xs text-stitch-on-surface-variant mb-6 max-w-xs leading-relaxed font-sans">
        Start coordinating your team cycles, sprint tasks, and meeting summaries by initializing your first workspace project.
      </p>

      <Button
        id="btn-create-project-empty-trigger"
        onClick={onCreateClick}
        variant="primary"
        className="flex items-center gap-2 select-none"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Create Project</span>
      </Button>
    </Card>
  );
};
