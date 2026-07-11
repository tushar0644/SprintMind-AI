import React from "react";

interface EmptyStateProps {
  onCreateClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 border border-zinc-900 rounded-xl bg-[#0c0c0e]/30 max-w-md mx-auto mt-16 animate-fade-in select-none">
      {/* Premium minimal outline graphic */}
      <div className="w-12 h-12 rounded-full bg-indigo-600/5 text-indigo-400 border border-indigo-500/10 flex items-center justify-center mb-5 shadow-sm shadow-indigo-500/5">
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      </div>

      <h3 className="text-sm font-semibold text-zinc-200 mb-1.5 font-sans tracking-tight">No projects found</h3>
      <p className="text-xs text-zinc-500 mb-6 max-w-xs leading-relaxed font-sans">
        Start coordinating your team cycles, sprint tasks, and meeting summaries by initializing your first workspace project.
      </p>

      <button
        id="btn-create-project-empty-trigger"
        onClick={onCreateClick}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-zinc-50 text-xs font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 flex items-center gap-2 select-none border border-indigo-500/10"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Create Project</span>
      </button>
    </div>
  );
};
