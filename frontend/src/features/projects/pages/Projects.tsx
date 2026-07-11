import React, { useState } from "react";
import { useProjects } from "../hooks/useProjects";
import { EmptyState } from "../components/EmptyState";
import { Project } from "../types";

export const Projects: React.FC = () => {
  const {
    projects,
    loading,
    error,
    setError,
    createProject,
    updateProject,
    deleteProject
  } = useProjects();

  // Dialog and Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");

  // Client Validation Warnings
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleOpenCreate = () => {
    setName("");
    setDescription("");
    setStatus("active");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setName(project.name);
    setDescription(project.description || "");
    setStatus(project.status);
    setFormError(null);
    setEditingProject(project);
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setFormError("Project name is required.");
      return false;
    }
    if (name.length < 3 || name.length > 100) {
      setFormError("Project name must be between 3 and 100 characters.");
      return false;
    }
    if (description.length > 500) {
      setFormError("Description cannot exceed 500 characters.");
      return false;
    }
    return true;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitLoading(true);
    setFormError(null);
    try {
      await createProject(name, description, status);
      setIsCreateOpen(false);
      triggerToast("Project created successfully!");
    } catch (err: any) {
      setFormError(err.message || "Failed to create project.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !editingProject) return;

    setSubmitLoading(true);
    setFormError(null);
    try {
      await updateProject(editingProject.id, name, description, status);
      setEditingProject(null);
      triggerToast("Project updated successfully!");
    } catch (err: any) {
      setFormError(err.message || "Failed to update project.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingProject) return;

    setSubmitLoading(true);
    try {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
      triggerToast("Project archived successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to archive project.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto relative min-h-[500px]">
      {/* Redesigned Success Toast (Slide-in left accent) */}
      {successToast && (
        <div 
          id="success-toast"
          className="fixed bottom-6 right-6 border-l-4 border-emerald-500 bg-[#0c0c0e] text-emerald-400 px-4.5 py-3.5 rounded-r-lg shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in z-50 shadow-black/40"
        >
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
          </svg>
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between border-b border-zinc-900/60 pb-5">
        <div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight font-sans">Projects</h1>
          <p className="text-xs text-zinc-500 mt-1">Manage team projects and sprint backlogs</p>
        </div>

        {projects.length > 0 && !loading && (
          <button
            id="btn-create-project-trigger"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-zinc-50 text-xs font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 flex items-center gap-2 border border-indigo-500/10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Main Error Alert Bar */}
      {error && (
        <div className="p-4 bg-red-500/5 border border-red-500/10 text-red-500 rounded-xl text-xs flex gap-2.5 max-w-lg mx-auto shadow-md">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-zinc-600 hover:text-zinc-400">✕</button>
        </div>
      )}

      {/* Loading Skeletons Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-zinc-900 bg-[#0c0c0e]/20 rounded-xl p-6 space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-zinc-900"></div>
                <div className="w-16 h-5 rounded-full bg-zinc-900"></div>
              </div>
              <div className="h-4.5 bg-zinc-900 rounded w-2/3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-zinc-900 rounded w-full"></div>
                <div className="h-3 bg-zinc-900 rounded w-5/6"></div>
              </div>
              <div className="border-t border-zinc-900 pt-4 flex items-center justify-between">
                <div className="w-20 h-3 bg-zinc-900 rounded"></div>
                <div className="w-10 h-6 bg-zinc-900 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState onCreateClick={handleOpenCreate} />
      ) : (
        /* Projects List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border border-zinc-900 bg-[#0c0c0e]/30 hover:bg-[#0c0c0e]/50 hover:border-zinc-800 rounded-xl p-6 transition-all duration-200 shadow-md group flex flex-col justify-between hover:scale-[1.01] hover:shadow-black/20"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between select-none">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-500/5">
                    P
                  </span>
                  
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${
                    project.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-800/40 text-zinc-400 border-zinc-800"
                  }`}>
                    {project.status}
                  </span>
                </div>

                <h3 className="font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors duration-200 tracking-tight text-sm font-sans">
                  {project.name}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px] leading-relaxed font-sans">
                  {project.description || "No description provided."}
                </p>
              </div>

              {/* Action Buttons Bar */}
              <div className="border-t border-zinc-900/60 pt-4 mt-6 flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono select-none">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(project)}
                    className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900/40 rounded transition-all duration-200"
                    title="Edit Project"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setDeletingProject(project)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900/40 rounded transition-all duration-200"
                    title="Archive Project"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-[2px] flex items-center justify-center p-6 z-50 select-none animate-fade-in">
          <div className="max-w-md w-full border border-zinc-900 bg-[#0c0c0e] rounded-xl p-6.5 shadow-2xl relative animate-scale-in">
            <h2 className="text-sm font-semibold text-zinc-100 mb-4 font-sans tracking-tight">Create New Project</h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/5 border border-red-500/10 text-red-500 rounded-lg text-xs leading-relaxed">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SprintMind Engine"
                  disabled={submitLoading}
                  className="w-full px-4 py-2.5 bg-[#09090b] border border-zinc-900 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize objectives, deliverables, or stack details..."
                  rows={3}
                  disabled={submitLoading}
                  className="w-full px-4 py-2.5 bg-[#09090b] border border-zinc-900 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:opacity-50 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  disabled={submitLoading}
                  className="w-full px-3 py-2.5 bg-[#09090b] border border-zinc-900 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:opacity-50 select-none"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-900/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submitLoading}
                  className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-zinc-50 text-xs font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 flex items-center gap-1.5 border border-indigo-500/10"
                >
                  {submitLoading ? "Saving..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-[2px] flex items-center justify-center p-6 z-50 select-none animate-fade-in">
          <div className="max-w-md w-full border border-zinc-900 bg-[#0c0c0e] rounded-xl p-6.5 shadow-2xl relative animate-scale-in">
            <h2 className="text-sm font-semibold text-zinc-100 mb-4 font-sans tracking-tight">Edit Project Settings</h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/5 border border-red-500/10 text-red-500 rounded-lg text-xs leading-relaxed">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SprintMind Engine"
                  disabled={submitLoading}
                  className="w-full px-4 py-2.5 bg-[#09090b] border border-zinc-900 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize objectives, deliverables, or stack details..."
                  rows={3}
                  disabled={submitLoading}
                  className="w-full px-4 py-2.5 bg-[#09090b] border border-zinc-900 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:opacity-50 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  disabled={submitLoading}
                  className="w-full px-3 py-2.5 bg-[#09090b] border border-zinc-900 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:opacity-50 select-none"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-900/60 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  disabled={submitLoading}
                  className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-zinc-50 text-xs font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 flex items-center gap-1.5 border border-indigo-500/10"
                >
                  {submitLoading ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION DIALOG */}
      {deletingProject && (
        <div className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-[2px] flex items-center justify-center p-6 z-50 select-none animate-fade-in">
          <div className="max-w-sm w-full border border-zinc-900 bg-[#0c0c0e] rounded-xl p-6 shadow-2xl relative animate-scale-in text-center">
            <div className="w-10 h-10 rounded-full bg-red-500/5 text-red-500 border border-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-sm font-semibold text-zinc-200 mb-1.5 font-sans tracking-tight">Archive Project?</h3>
            <p className="text-xs text-zinc-500 mb-6 max-w-[280px] mx-auto leading-relaxed">
              Are you sure you want to archive <strong>{deletingProject.name}</strong>? This action can be undone by restoring status.
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                disabled={submitLoading}
                className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-zinc-50 text-xs font-semibold rounded-lg shadow-lg hover:shadow-red-500/10 transition-all duration-200 border border-red-500/10"
              >
                {submitLoading ? "Archiving..." : "Yes, Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
