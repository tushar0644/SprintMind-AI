import React, { useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { aiService } from "../services/aiService";
import { Calendar, Sparkles, Send, RefreshCw } from "lucide-react";

export const SprintPlanner: React.FC = () => {
  const [context, setContext] = useState("");
  const [objectives, setObjectives] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context.trim() || !objectives.trim()) {
      setError("Please fill out all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plan = await aiService.generateSprintPlan(context, objectives);
      setResult(plan);
    } catch (err: any) {
      setError("Failed to generate sprint plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
        <div className="border-b border-stitch-outline-variant/60 pb-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface">Sprint Planner</h1>
          </div>
          <p className="text-xs text-stitch-on-surface-variant mt-1">
            Define goals and construct a full backlog structure using Gemini.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Project Context</label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Building an e-commerce checkout flow with stripe..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all resize-none"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Sprint Objectives</label>
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="e.g. Implement payment flow, handle webhooks, integrate fraud check..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all resize-none"
                />
              </div>

              {error && <p className="text-[10px] text-stitch-error font-semibold">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 flex items-center justify-center gap-2 font-bold text-xs shadow-sm shadow-indigo-100"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Planning Sprint...</span>
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
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl min-h-[300px] flex flex-col">
            <div className="flex items-center gap-2 border-b border-stitch-outline-variant/40 pb-3 mb-4">
              <Sparkles className="w-4 h-4 text-stitch-primary animate-pulse" />
              <h3 className="text-xs font-bold text-stitch-on-surface">AI Recommendation</h3>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col justify-center items-center space-y-3 animate-pulse">
                <div className="h-3 w-3/4 bg-stitch-surface-container rounded" />
                <div className="h-3 w-1/2 bg-stitch-surface-container rounded" />
                <div className="h-3 w-2/3 bg-stitch-surface-container rounded" />
              </div>
            ) : result ? (
              <div className="flex-1 overflow-y-auto max-h-[350px] text-xs leading-relaxed text-stitch-on-surface bg-stitch-surface-container/10 p-3 rounded-xl border border-stitch-outline-variant/30 select-text whitespace-pre-wrap font-sans">
                {result}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center text-stitch-on-surface-variant/40 py-12 select-none">
                <Send className="w-8 h-8 mb-2" />
                <p className="text-xs font-medium max-w-xs">
                  Fill in the sprint context and generate output to display plans here.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
};
