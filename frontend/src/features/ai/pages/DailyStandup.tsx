import React, { useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { aiService } from "../services/aiService";
import { UserCheck, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

export const DailyStandup: React.FC = () => {
  const [completed, setCompleted] = useState("");
  const [planned, setPlanned] = useState("");
  const [blockers, setBlockers] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completed.trim() && !planned.trim() && !blockers.trim()) {
      setError("Please fill out at least one update section.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const report = await aiService.generateDailyStandup(
        completed.split("\n").filter(x => x.trim()),
        planned.split("\n").filter(x => x.trim()),
        blockers.split("\n").filter(x => x.trim())
      );
      setResult(report);
    } catch (err: any) {
      setError("Failed to generate daily standup report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
        <div className="border-b border-stitch-outline-variant/60 pb-5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface">Daily Standup Reporter</h1>
          </div>
          <p className="text-xs text-stitch-on-surface-variant mt-1">
            Build structured daily check-ins instantly from rough logs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Completed (Yesterday)</label>
                <textarea
                  value={completed}
                  onChange={(e) => setCompleted(e.target.value)}
                  placeholder="One task per line..."
                  rows={2}
                  className="w-full px-3 py-1.5 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-1 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all resize-none"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Planned (Today)</label>
                <textarea
                  value={planned}
                  onChange={(e) => setPlanned(e.target.value)}
                  placeholder="One task per line..."
                  rows={2}
                  className="w-full px-3 py-1.5 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-1 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all resize-none"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-stitch-on-surface-variant">Blockers</label>
                <textarea
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Impediments, if any..."
                  rows={2}
                  className="w-full px-3 py-1.5 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-1 focus:ring-stitch-primary/30 focus:border-stitch-primary transition-all resize-none"
                />
              </div>

              {error && <p className="text-[10px] text-stitch-error font-semibold">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2 flex items-center justify-center gap-2 font-bold text-xs shadow-sm shadow-purple-100"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Formatting Standup...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Standup Report</span>
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Result Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl min-h-[300px] flex flex-col">
            <div className="flex items-center gap-2 border-b border-stitch-outline-variant/40 pb-3 mb-4">
              <Sparkles className="w-4 h-4 text-stitch-primary animate-pulse" />
              <h3 className="text-xs font-bold text-stitch-on-surface">Formatted Update</h3>
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
                <AlertCircle className="w-8 h-8 mb-2 text-purple-300" />
                <p className="text-xs font-medium max-w-xs">
                  Fill in your standup metrics to display the structured summary here.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
};
