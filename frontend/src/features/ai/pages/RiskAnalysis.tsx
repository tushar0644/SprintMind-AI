import React, { useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { aiService } from "../services/aiService";
import { ShieldAlert, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

export const RiskAnalysis: React.FC = () => {
  const [scope, setScope] = useState("");
  const [timeline, setTimeline] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scope.trim() || !timeline.trim()) {
      setError("Please fill out scope and timeline details.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const risks = await aiService.analyzeRisks(scope, timeline);
      setResult(risks);
    } catch (err: any) {
      setError("Failed to analyze risks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
        <div className="border-b border-stitch-outline-variant/60 pb-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-sky-600 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface">Risk Analyzer</h1>
          </div>
          <p className="text-xs text-stitch-on-surface-variant mt-1">
            Examine scope vectors, timeline constraints, and resource risks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Project Scope & Deliverables</label>
                <textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="Outline the project scope, integrations, complexity factors, and deliverables..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all resize-none"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Timeline & Resource Constraints</label>
                <textarea
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="Details about target deadlines, team capacity, and resource distribution..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all resize-none"
                />
              </div>

              {error && <p className="text-[10px] text-stitch-error font-semibold">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-2 flex items-center justify-center gap-2 font-bold text-xs shadow-sm shadow-sky-100"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Risks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Risk Analysis</span>
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Result Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl min-h-[300px] flex flex-col">
            <div className="flex items-center gap-2 border-b border-stitch-outline-variant/40 pb-3 mb-4">
              <Sparkles className="w-4 h-4 text-stitch-primary animate-pulse" />
              <h3 className="text-xs font-bold text-stitch-on-surface">AI Risk Analysis Results</h3>
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
                <AlertCircle className="w-8 h-8 mb-2 text-sky-300" />
                <p className="text-xs font-medium max-w-xs">
                  Fill in timeline and scope details to retrieve AI risk indicators.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
};
