import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProjectLayout } from "../components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { SprintBoard } from "../../sprints/components/SprintBoard";
import { sprintService } from "../../../services/sprintService";
import { projectService } from "../services/projectService";
import { Project } from "../types";
import { Sprint } from "../../../types/Sprint";
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  FileText,
  Sliders,
  CheckCircle2,
  X,
  Zap,
  Kanban
} from "lucide-react";

export const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // State Management
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingSprints, setLoadingSprints] = useState(true);
  const [isPlanningOverlay, setIsPlanningOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sprint Capacity Options
  const [capacity, setCapacity] = useState<number>(20);
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Fetch Project Details
  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingProject(true);
      const projects = await projectService.getProjects();
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setProject(found);
      }
    } catch (err: any) {
      console.error("Failed to load project details:", err);
    } finally {
      setLoadingProject(false);
    }
  }, [projectId]);

  // Fetch Sprints
  const fetchSprints = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingSprints(true);
      setError(null);
      const data = await sprintService.getSprints(projectId);
      setSprints(data || []);
    } catch (err: any) {
      console.error("Failed to load project sprints:", err);
      setError(err.response?.data?.detail || err.message || "Failed to fetch sprints.");
    } finally {
      setLoadingSprints(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails();
    fetchSprints();
  }, [fetchProjectDetails, fetchSprints]);

  // Workflow Handler: Click Generate Sprint Plan -> POST plan-sprints -> Loading Overlay -> Success Toast -> GET sprints -> Render Sprint Board
  const handleGenerateSprintPlan = async () => {
    if (!projectId) return;

    setIsPlanningOverlay(true);
    setIsCapacityModalOpen(false);
    setError(null);

    try {
      // 1. POST plan-sprints
      const res = await sprintService.planSprints(projectId, capacity);

      // 2. Success Toast
      const msg = `Sprint plan generated! ${res.sprints_count} sprint(s) created, ${res.tasks_scheduled} task(s) scheduled.`;
      triggerToast(msg);

      // 3. GET sprints to fetch updated state
      const updatedSprints = await sprintService.getSprints(projectId);
      setSprints(updatedSprints || res.sprints || []);
    } catch (err: any) {
      console.error("Sprint planning failed:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to generate sprint plan. Please check task dependencies and try again.";
      setError(errorMsg);
    } finally {
      setIsPlanningOverlay(false);
    }
  };

  return (
    <ProjectLayout>
      {/* Container */}
      <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 py-4 relative min-h-[600px]">
        {/* Success Toast */}
        {successToast && (
          <div
            id="success-toast"
            className="fixed bottom-6 right-6 border-l-4 border-emerald-500 bg-white text-stitch-on-surface px-4.5 py-3.5 rounded-r-xl shadow-2xl text-xs font-semibold flex items-center gap-3 animate-fade-in z-50 border border-stitch-outline-variant/60 border-l-emerald-500"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Glassmorphic Loading Overlay */}
        {isPlanningOverlay && (
          <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md flex flex-col items-center justify-center z-50 select-none animate-fade-in">
            <div className="bg-white border border-stitch-outline-variant/60 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-5 animate-scale-in">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                <Sparkles className="w-7 h-7 text-indigo-600 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-stitch-on-surface font-sans">
                  Generating Sprint Plan...
                </h3>
                <p className="text-xs text-stitch-on-surface-variant font-medium leading-relaxed">
                  Analyzing task dependencies, story point estimates, and capacity bin-packing to produce optimal sprint assignments.
                </p>
              </div>

              <div className="w-full bg-stitch-surface-container h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full animate-pulse w-3/4 mx-auto" />
              </div>
            </div>
          </div>
        )}

        {/* Top Breadcrumb & Header */}
        <div className="flex flex-col gap-4 border-b border-stitch-outline-variant/60 pb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/projects")}
              className="flex items-center gap-1.5 text-xs font-semibold text-stitch-on-surface-variant hover:text-stitch-primary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Projects</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/projects/${projectId}/files`)}
                className="px-3 py-1.5 bg-white border border-stitch-outline-variant hover:bg-stitch-surface-container rounded-xl text-xs font-semibold text-stitch-on-surface flex items-center gap-1.5 transition-all shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-stitch-on-surface-variant" />
                <span>Project Files</span>
              </button>
            </div>
          </div>

          {/* Project Banner & Details */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-stitch-on-surface font-sans">
                  {loadingProject ? "Loading..." : project?.name || "Project Details"}
                </h1>
                {project && (
                  <Badge
                    variant={project.status === "active" ? "success" : "neutral"}
                    className="text-[9px] uppercase px-2 py-0.5 font-bold rounded-lg"
                  >
                    {project.status}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-stitch-on-surface-variant max-w-2xl leading-relaxed">
                {project?.description || "Visual Sprint Planning interface and project deliverables management."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsCapacityModalOpen(true)}
                className="px-3 py-2 bg-white border border-stitch-outline-variant hover:bg-stitch-surface-container rounded-xl text-xs font-bold text-stitch-on-surface flex items-center gap-1.5 transition-all shadow-sm select-none"
                title="Configure Sprint Capacity"
              >
                <Sliders className="w-3.5 h-3.5 text-stitch-on-surface-variant" />
                <span>Capacity: {capacity} pts</span>
              </button>

              <Button
                id="btn-generate-sprint-plan"
                onClick={handleGenerateSprintPlan}
                disabled={isPlanningOverlay}
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-xs shadow-md shadow-indigo-100 transition-all select-none"
              >
                {isPlanningOverlay ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Planning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Sprint Plan</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area: Sprint Board */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Kanban className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-stitch-on-surface tracking-tight font-sans">
                Sprint Board & Assignments
              </h2>
            </div>
            <button
              onClick={fetchSprints}
              disabled={loadingSprints || isPlanningOverlay}
              className="text-xs text-stitch-on-surface-variant hover:text-stitch-primary flex items-center gap-1 font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadingSprints ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Render Sprint Board Component */}
          <SprintBoard
            sprints={sprints}
            loading={loadingSprints}
            error={error}
            onGeneratePlan={handleGenerateSprintPlan}
            onRetry={fetchSprints}
          />
        </div>

        {/* Capacity Modal */}
        {isCapacityModalOpen && (
          <div className="fixed inset-0 bg-stitch-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 select-none animate-fade-in">
            <Card className="max-w-sm w-full border-stitch-outline-variant bg-white rounded-3xl p-6 shadow-2xl relative animate-scale-in space-y-5">
              <div className="flex items-center justify-between border-b border-stitch-outline-variant/40 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-stitch-on-surface font-sans">
                    Sprint Capacity Settings
                  </h3>
                </div>
                <button
                  onClick={() => setIsCapacityModalOpen(false)}
                  className="p-1 rounded-lg text-stitch-on-surface-variant hover:bg-stitch-surface-container transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-stitch-on-surface-variant">
                  Maximum Story Points per Sprint
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={capacity}
                  onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 20))}
                  className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-sm font-bold text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
                <p className="text-[11px] text-stitch-on-surface-variant/70 leading-relaxed font-sans">
                  The automated sprint planner allocates tasks into sequential sprints up to this story point limit while respecting dependency constraints.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  onClick={() => setIsCapacityModalOpen(false)}
                  variant="secondary"
                  size="sm"
                  className="rounded-xl font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateSprintPlan}
                  variant="primary"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Plan</span>
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ProjectLayout>
  );
};
