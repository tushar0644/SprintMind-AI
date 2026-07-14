import React, { useState } from "react";
import { useProjects } from "../hooks/useProjects";
import { EmptyState } from "../components/EmptyState";
import { Project } from "../types";
import { ProjectLayout } from "../components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Input } from "../../../components/ui/Input";

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

  // UI Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");

  // Client Validation Warnings
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
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
      triggerToast("Project archived successfully!");
      setDeletingProject(null);
    } catch (err: any) {
      setError(err.message || "Failed to archive project.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Client-side filtering of projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-6xl mx-auto relative min-h-[500px]">
        {/* Redesigned Success Toast */}
        {successToast && (
          <div
            id="success-toast"
            className="fixed bottom-6 right-6 border-l-4 border-emerald-500 bg-white text-stitch-on-surface px-4.5 py-3.5 rounded-r-lg shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in z-50 border border-stitch-outline-variant/60 border-l-emerald-500"
          >
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
            </svg>
            <span>{successToast}</span>
          </div>
        )}

        {/* Top Header Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stitch-outline-variant/60 pb-5 gap-4">
          <div>
            <h1 className="text-lg font-bold text-stitch-on-surface tracking-tight font-sans">Projects</h1>
            <p className="text-xs text-stitch-on-surface-variant mt-1">Manage team projects and sprint backlogs</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-3 flex items-center text-stitch-on-surface-variant">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stitch-outline-variant rounded-full pl-9 pr-4 py-1.5 text-xs text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all duration-200"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-stitch-outline-variant rounded-stitch px-3 py-1.5 text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary select-none w-full sm:w-auto"
            >
              <option value="all">All Projects</option>
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
            </select>

            {projects.length > 0 && !loading && (
              <Button
                id="btn-create-project-trigger"
                onClick={handleOpenCreate}
                variant="primary"
                size="sm"
                className="flex items-center gap-2 select-none shrink-0 w-full sm:w-auto"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Project</span>
              </Button>
            )}
          </div>
        </div>

        {/* Main Error Alert Bar */}
        {error && (
          <div className="p-4 bg-red-500/5 border border-red-500/10 text-stitch-error rounded-xl text-xs flex gap-2.5 max-w-lg mx-auto shadow-sm">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-stitch-on-surface-variant hover:text-stitch-on-surface">✕</button>
          </div>
        )}

        {/* Loading Skeletons Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-stitch-outline-variant bg-white rounded-xl p-6 space-y-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-stitch-surface-container-high"></div>
                  <div className="w-16 h-5 rounded-full bg-stitch-surface-container-high"></div>
                </div>
                <div className="h-4 bg-stitch-surface-container-high rounded w-2/3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-stitch-surface-container-high rounded w-full"></div>
                  <div className="h-3 bg-stitch-surface-container-high rounded w-5/6"></div>
                </div>
                <div className="border-t border-stitch-surface-container-high pt-4 flex items-center justify-between">
                  <div className="w-20 h-3 bg-stitch-surface-container-high rounded"></div>
                  <div className="w-10 h-6 bg-stitch-surface-container-high rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreateClick={handleOpenCreate} />
        ) : filteredProjects.length === 0 ? (
          /* Empty search results state */
          <div className="flex flex-col items-center justify-center text-center p-10 border border-stitch-outline-variant/60 rounded-xl bg-white max-w-md mx-auto mt-16 animate-fade-in select-none">
            <div className="w-10 h-10 rounded-full bg-stitch-surface-container text-stitch-on-surface-variant flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-stitch-on-surface mb-1">No matching projects</h3>
            <p className="text-xs text-stitch-on-surface-variant max-w-xs leading-relaxed">
              We couldn't find any projects matching your search criteria. Try adjusting your query or status filter.
            </p>
          </div>
        ) : (
          /* Projects List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                hoverable={true}
                className="project-card border-stitch-outline-variant hover:border-stitch-outline flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-200 bg-white"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between select-none">
                    <span className="w-8 h-8 rounded-lg bg-stitch-primary/10 text-stitch-primary flex items-center justify-center font-bold text-sm shrink-0 border border-stitch-primary/5">
                      {project.name.charAt(0).toUpperCase()}
                    </span>

                    <Badge variant={project.status === "active" ? "success" : "neutral"}>
                      {project.status}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-stitch-on-surface hover:text-stitch-primary transition-colors duration-200 tracking-tight text-sm font-sans">
                    {project.name}
                  </h3>
                  <p className="text-xs text-stitch-on-surface-variant line-clamp-2 min-h-[32px] leading-relaxed font-sans">
                    {project.description || "No description provided."}
                  </p>
                </div>

                {/* Action Buttons Bar */}
                <div className="border-t border-stitch-outline-variant/60 pt-4 mt-6 flex items-center justify-between">
                  <span className="text-[10px] text-stitch-on-surface-variant/60 font-mono select-none">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(project)}
                      className="p-1.5 text-stitch-on-surface-variant hover:text-stitch-primary hover:bg-stitch-surface-container rounded transition-all duration-200"
                      title="Edit Project"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => setDeletingProject(project)}
                      className="p-1.5 text-stitch-on-surface-variant hover:text-stitch-error hover:bg-stitch-surface-container rounded transition-all duration-200"
                      title="Archive Project"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* CREATE MODAL */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-stitch-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 select-none animate-fade-in">
            <Card className="max-w-md w-full border-stitch-outline-variant bg-white rounded-xl p-6.5 shadow-2xl relative animate-scale-in">
              <h2 className="text-sm font-semibold text-stitch-on-surface mb-4 font-sans tracking-tight">Create New Project</h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-500/5 border border-red-500/10 text-stitch-error rounded-lg text-xs leading-relaxed">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
                <Input
                  label="Project Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SprintMind Engine"
                  disabled={submitLoading}
                  required
                />

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Summarize objectives, deliverables, or stack details..."
                    rows={3}
                    disabled={submitLoading}
                    className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low resize-none leading-relaxed"
                  />
                </div>

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    disabled={submitLoading}
                    className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low select-none"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stitch-outline-variant/60 mt-6">
                  <Button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={submitLoading}
                    variant="secondary"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitLoading}
                    variant="primary"
                    size="sm"
                  >
                    {submitLoading ? "Saving..." : "Save Project"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* EDIT MODAL */}
        {editingProject && (
          <div className="fixed inset-0 bg-stitch-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 select-none animate-fade-in">
            <Card className="max-w-md w-full border-stitch-outline-variant bg-white rounded-xl p-6.5 shadow-2xl relative animate-scale-in">
              <h2 className="text-sm font-semibold text-stitch-on-surface mb-4 font-sans tracking-tight">Edit Project Settings</h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-500/5 border border-red-500/10 text-stitch-error rounded-lg text-xs leading-relaxed">
                  {formError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
                <Input
                  label="Project Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SprintMind Engine"
                  disabled={submitLoading}
                  required
                />

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Summarize objectives, deliverables, or stack details..."
                    rows={3}
                    disabled={submitLoading}
                    className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low resize-none leading-relaxed"
                  />
                </div>

                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-semibold text-stitch-on-surface-variant select-none">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    disabled={submitLoading}
                    className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-stitch text-sm text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all duration-200 disabled:opacity-50 disabled:bg-stitch-surface-container-low select-none"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stitch-outline-variant/60 mt-6">
                  <Button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    disabled={submitLoading}
                    variant="secondary"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitLoading}
                    variant="primary"
                    size="sm"
                  >
                    {submitLoading ? "Updating..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ARCHIVE CONFIRMATION DIALOG */}
        {deletingProject && (
          <div className="fixed inset-0 bg-stitch-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 select-none animate-fade-in">
            <Card className="max-w-sm w-full border-stitch-outline-variant bg-white rounded-xl p-6 shadow-2xl relative animate-scale-in text-center">
              <div className="w-10 h-10 rounded-full bg-stitch-error/10 text-stitch-error border border-stitch-error/15 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-sm font-semibold text-stitch-on-surface mb-1.5 font-sans tracking-tight">Archive Project?</h3>
              <p className="text-xs text-stitch-on-surface-variant mb-6 max-w-[280px] mx-auto leading-relaxed">
                Are you sure you want to archive <strong>{deletingProject.name}</strong>? This action can be undone by restoring status.
              </p>

              <div className="flex items-center justify-center gap-2.5">
                <Button
                  type="button"
                  onClick={() => setDeletingProject(null)}
                  disabled={submitLoading}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={submitLoading}
                  variant="danger"
                  size="sm"
                  className="bg-stitch-error hover:bg-red-700 text-white"
                >
                  {submitLoading ? "Archiving..." : "Yes, Archive"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ProjectLayout>
  );
};
