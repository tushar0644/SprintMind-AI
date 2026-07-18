import React, { useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { aiService } from "../services/aiService";
import { HeartPulse, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

export const ProjectHealth: React.FC = () => {
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setError("Please describe the project situation.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const healthAnalysis = await aiService.analyzeProjectHealth(details, []);
      setResult(healthAnalysis);
    } catch (err: any) {
      setError("Failed to analyze project health.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
        <div className="border-b border-stitch-outline-variant/60 pb-5">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-600 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface">Project Health Analyzer</h1>
          </div>
          <p className="text-xs text-stitch-on-surface-variant mt-1">
            Detect project anomalies, resource bottleneck indices, and timeline health vectors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Project Status & Challenges</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe task progress, missing requirements, team burnout signals, or key impediments..."
                  rows={6}
                  className="w-full px-3 py-2 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all resize-none"
                />
              </div>

              {error && <p className="text-[10px] text-stitch-error font-semibold">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2 flex items-center justify-center gap-2 font-bold text-xs shadow-sm shadow-rose-100"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Health Baseline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Health Diagnosis</span>
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Result Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl min-h-[300px] flex flex-col">
            <div className="flex items-center gap-2 border-b border-stitch-outline-variant/40 pb-3 mb-4">
              <Sparkles className="w-4 h-4 text-stitch-primary animate-pulse" />
              <h3 className="text-xs font-bold text-stitch-on-surface">Health Diagnostics</h3>
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
                <AlertCircle className="w-8 h-8 mb-2 text-rose-300" />
                <p className="text-xs font-medium max-w-xs">
                  Provide project signals to identify anomalies and display findings here.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
};
