import React, { useState, useEffect } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { aiService } from "../services/aiService";
import { useProjects } from "../../projects/hooks/useProjects";
import { Calendar, Sparkles, Send, RefreshCw, ChevronDown } from "lucide-react";

export const SprintPlanner: React.FC = () => {
  const [context, setContext] = useState("");
  const [objectives, setObjectives] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const { projects } = useProjects();

  useEffect(() => {
    const activeProject = projects.find(p => p.status === "active");
    if (activeProject) {
      setSelectedProjectId(activeProject.id);
    } else if (projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!selectedProjectId) {
      setError("Please select a project context first.");
      return;
    }
    if (!context.trim() || !objectives.trim()) {
      setError("Please fill out all context and objective fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setJobStatus("Submitting background planning job...");

    try {
      // 1. Submit AI task to Background Job Framework
      const job = await aiService.submitJob("sprint-plan", selectedProjectId, {
        project_context: context.trim(),
        objectives: objectives.trim()
      });

      setJobStatus("Job pending in queue...");
      const jobId = job.id;

      // 2. Poll job status until resolution
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await aiService.getJobStatus(jobId);
          
          if (statusRes.status === "running") {
            setJobStatus("AI Planner is detailing backlog tickets...");
          } else if (statusRes.status === "completed") {
            clearInterval(pollInterval);
            setResult(statusRes.result?.output || "Success");
            setLoading(false);
            setJobStatus("");
          } else if (statusRes.status === "failed") {
            clearInterval(pollInterval);
            setError(statusRes.error || "Failed to process sprint planner job.");
            setLoading(false);
            setJobStatus("");
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          setError("Failed checking planning status. Please retry.");
          setLoading(false);
          setJobStatus("");
        }
      }, 1500);

    } catch (err: any) {
      setError("Failed to start background planning task. Please retry.");
      setLoading(false);
      setJobStatus("");
    }
  };

  const handleRetry = () => {
    handleSubmit();
  };

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
        <div className="border-b border-stitch-outline-variant/60 pb-5 select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface font-sans">Sprint Planner</h1>
            </div>
            <p className="text-xs text-stitch-on-surface-variant mt-1">
              Define goals and construct a full backlog structure using Gemini through background jobs.
            </p>
          </div>

          {selectedProjectId && (
            <Button
              onClick={() => window.location.href = `/projects/${selectedProjectId}`}
              variant="secondary"
              size="sm"
              className="bg-white border border-stitch-outline-variant hover:bg-stitch-surface-container rounded-xl text-xs font-bold text-stitch-on-surface flex items-center gap-1.5 shrink-0"
            >
              <span>View Visual Sprint Board</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project Context selector */}
              <div className="flex flex-col space-y-1.5 select-none">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Associated Project Workspace</label>
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2.5 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all appearance-none"
                  >
                    <option value="">Select a project…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Project Context</label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Building an e-commerce checkout flow with stripe..."
                  rows={4}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all resize-none disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Sprint Objectives</label>
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="e.g. Implement payment flow, handle webhooks, integrate fraud check..."
                  rows={3}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all resize-none disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-100 rounded-xl select-none">
                  <p className="text-[10px] text-stitch-error font-semibold">{error}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full py-1.5 bg-white border border-stitch-outline-variant/60 hover:bg-zinc-50 rounded-lg text-[10px] text-stitch-on-surface font-bold flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Request</span>
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 flex items-center justify-center gap-2 font-bold text-xs shadow-sm shadow-indigo-100 select-none"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Job...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Sprint Plan</span>
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Result Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl min-h-[300px] flex flex-col shadow-sm">
            <div className="flex items-center gap-2 border-b border-stitch-outline-variant/40 pb-3 mb-4 select-none">
              <Sparkles className="w-4 h-4 text-stitch-primary" />
              <h3 className="text-xs font-bold text-stitch-on-surface">AI Recommendation</h3>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col justify-center items-center space-y-4 text-center select-none">
                <div className="flex space-x-1.5 items-center">
                  <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
                <div className="text-[10px] font-bold text-stitch-primary uppercase tracking-wider animate-pulse">
                  {jobStatus}
                </div>
                <div className="w-full max-w-xs space-y-2 animate-pulse">
                  <div className="h-2 bg-stitch-surface-container rounded w-3/4 mx-auto" />
                  <div className="h-2 bg-stitch-surface-container rounded w-1/2 mx-auto" />
                </div>
              </div>
            ) : result ? (
              <div className="flex-1 overflow-y-auto max-h-[350px] text-xs leading-relaxed text-stitch-on-surface bg-stitch-surface-container/10 p-4.5 rounded-2xl border border-stitch-outline-variant/30 select-text whitespace-pre-wrap font-sans">
                {result}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center text-stitch-on-surface-variant/40 py-12 select-none">
                <Send className="w-8 h-8 mb-2" />
                <p className="text-xs font-medium max-w-xs leading-relaxed">
                  Fill in the project objectives and run generator to start the planning job.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
};
