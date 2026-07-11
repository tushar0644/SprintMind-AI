import React from "react";

interface TaskEmptyStateProps {
  onCreateClick?: () => void;
}

export const TaskEmptyState: React.FC<TaskEmptyStateProps> = ({ onCreateClick }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 border border-zinc-900 rounded-xl bg-[#0c0c0e]/30 max-w-md mx-auto mt-16 animate-fade-in select-none">
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-indigo-600/5 text-indigo-400 border border-indigo-500/10 flex items-center justify-center mb-5 shadow-sm shadow-indigo-500/5">
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </div>

      <h3 className="text-sm font-semibold text-zinc-200 mb-1.5 font-sans tracking-tight">
        No tasks yet
      </h3>
      <p className="text-xs text-zinc-500 mb-6 max-w-xs leading-relaxed font-sans">
        Break your project into actionable tasks. Track progress by status, set priorities, and move work forward.
      </p>

      <button
        id="btn-create-task-empty-trigger"
        onClick={onCreateClick}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-zinc-50 text-xs font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 flex items-center gap-2 select-none border border-indigo-500/10"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Create Task</span>
      </button>
    </div>
  );
};
