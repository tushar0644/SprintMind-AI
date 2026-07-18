import React, { useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { aiService } from "../services/aiService";
import { Signal, Sparkles, AlertCircle, RefreshCw, Plus, Trash2 } from "lucide-react";

interface SimpleTask {
  id: string;
  title: string;
  priority: string;
}

export const TaskPrioritizer: React.FC = () => {
  const [tasks, setTasks] = useState<SimpleTask[]>([
    { id: "1", title: "Setup auth middleware", priority: "high" },
    { id: "2", title: "Write API documentation", priority: "low" }
  ]);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    setTasks(prev => [
      ...prev,
      { id: String(prev.length + 1), title: newTitle, priority: newPriority }
    ]);
    setNewTitle("");
  };

  const handleRemoveTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tasks.length === 0) {
      setError("Please add at least one task to prioritize.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.prioritizeTasks(tasks);
      setResult(response);
    } catch (err: any) {
      setError("Failed to prioritize tasks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
        <div className="border-b border-stitch-outline-variant/60 pb-5">
          <div className="flex items-center gap-2">
            <Signal className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface">Task Prioritizer</h1>
          </div>
          <p className="text-xs text-stitch-on-surface-variant mt-1">
            Reorder and weight backlog items using AI reasoning vectors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold text-stitch-on-surface">Backlog List</h3>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 bg-stitch-surface-container/20 border border-stitch-outline-variant/30 rounded-xl text-xs">
                  <div className="truncate flex-1">
                    <span className="font-semibold text-stitch-on-surface">{t.title}</span>
                    <span className="ml-2 bg-stitch-primary/10 text-stitch-primary text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{t.priority}</span>
                  </div>
                  <button onClick={() => handleRemoveTask(t.id)} className="text-stitch-on-surface-variant/40 hover:text-stitch-error ml-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick add */}
            <div className="flex items-center gap-2 border-t border-stitch-outline-variant/30 pt-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Implement JWT check"
                className="flex-1 px-3 py-1.5 bg-white border border-stitch-outline-variant rounded-xl text-xs text-stitch-on-surface focus:outline-none focus:ring-1 focus:ring-stitch-primary/40 focus:border-stitch-primary"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="bg-white border border-stitch-outline-variant rounded-xl px-2 py-1.5 text-xs text-stitch-on-surface"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button onClick={handleAddTask} className="p-1.5 bg-stitch-primary hover:bg-stitch-primary-container text-white rounded-xl">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="border-t border-stitch-outline-variant/30 pt-3">
              {error && <p className="text-[10px] text-stitch-error font-semibold mb-3">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-2 flex items-center justify-center gap-2 font-bold text-xs shadow-sm shadow-amber-100"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Prioritizing Queue...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate AI Prioritization</span>
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Result Column */}
          <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl min-h-[300px] flex flex-col">
            <div className="flex items-center gap-2 border-b border-stitch-outline-variant/40 pb-3 mb-4">
              <Sparkles className="w-4 h-4 text-stitch-primary animate-pulse" />
              <h3 className="text-xs font-bold text-stitch-on-surface">Prioritization Insights</h3>
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
                <AlertCircle className="w-8 h-8 mb-2 text-amber-300" />
                <p className="text-xs font-medium max-w-xs">
                  Create a backlog list to retrieve optimized prioritizations.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
};
