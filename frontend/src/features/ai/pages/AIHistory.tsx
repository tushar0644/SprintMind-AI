import React, { useEffect, useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { aiService } from "../services/aiService";
import { useProjects } from "../../projects/hooks/useProjects";
import {
  History,
  Calendar,
  Trash2,
  Copy,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  FileJson,
  FileText,
  Sparkles,
  Info,
  Check
} from "lucide-react";

interface AIConversation {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  tool_type: string;
  payload: any;
  created_at: string;
  updated_at: string;
}

export const AIHistory: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<AIConversation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { projects } = useProjects();

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.getHistory();
      setHistoryItems(data);
    } catch (err: any) {
      setError("Failed to load AI execution history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setMessages([]);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    setError(null);
    try {
      const details = await aiService.getHistoryDetail(id);
      setMessages(details.messages || []);
    } catch (err: any) {
      setError("Failed to fetch conversation details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this history item?")) return;
    try {
      await aiService.deleteHistoryItem(id);
      setHistoryItems(prev => prev.filter(item => item.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      alert("Failed to delete history item.");
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = (item: AIConversation, assistantResponse: string) => {
    const content = `# ${item.title}
Date: ${new Date(item.created_at).toLocaleString()}
Tool: ${item.tool_type.toUpperCase()}

## Input Payload
\`\`\`json
${JSON.stringify(item.payload, null, 2)}
\`\`\`

## AI Assistant Recommendation
${assistantResponse}
`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${item.tool_type}_run_${item.id.slice(0, 8)}.md`);
    link.click();
  };

  const handleExportJSON = (item: AIConversation, assistantResponse: string) => {
    const data = {
      ...item,
      response: assistantResponse
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${item.tool_type}_run_${item.id.slice(0, 8)}.json`);
    link.click();
  };

  const handleRegenerate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRegeneratingId(id);
    setError(null);
    try {
      const job = await aiService.regenerateHistory(id);
      
      // Poll job status until completed
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await aiService.getJobStatus(job.id);
          if (statusRes.status === "completed") {
            clearInterval(pollInterval);
            setRegeneratingId(null);
            fetchHistory();
            // Automatically expand the regenerated item if it's the active one
            if (expandedId === id) {
              const details = await aiService.getHistoryDetail(id);
              setMessages(details.messages || []);
            }
          } else if (statusRes.status === "failed") {
            clearInterval(pollInterval);
            setRegeneratingId(null);
            setError(`Regeneration failed: ${statusRes.error || "Unknown LLM error"}`);
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          setRegeneratingId(null);
          setError("Failed checking regeneration status.");
        }
      }, 1500);

    } catch (err: any) {
      setRegeneratingId(null);
      setError("Failed to initiate regeneration background job.");
    }
  };

  const filteredItems = historyItems.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.tool_type.toLowerCase().includes(searchLower)
    );
  });

  const getProjectName = (projId: string) => {
    const proj = projects.find(p => p.id === projId);
    return proj ? proj.name : "Global Helper";
  };

  const getToolBadgeColor = (type: string) => {
    switch (type) {
      case "sprint-plan": return "bg-indigo-50 border-indigo-200 text-indigo-700";
      case "project-health": return "bg-rose-50 border-rose-200 text-rose-700";
      case "prioritize": return "bg-amber-50 border-amber-200 text-amber-700";
      case "meeting-notes": return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "daily-standup": return "bg-purple-50 border-purple-200 text-purple-700";
      case "risk-analysis": return "bg-sky-50 border-sky-200 text-sky-700";
      default: return "bg-zinc-50 border-zinc-200 text-zinc-700";
    }
  };

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="border-b border-stitch-outline-variant/60 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface font-sans">AI Interaction History</h1>
            </div>
            <p className="text-xs text-stitch-on-surface-variant mt-1">
              Review, copy, export, or regenerate recommendations from past AI assistant runs.
            </p>
          </div>
          <Button onClick={fetchHistory} variant="secondary" className="flex items-center gap-2 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Filter and Search */}
        <div className="flex items-center bg-white border border-stitch-outline-variant/60 px-3.5 py-2.5 rounded-2xl shadow-sm max-w-md select-none">
          <Search className="w-4 h-4 text-stitch-on-surface-variant/50 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by title or helper type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-stitch-on-surface focus:outline-none placeholder-stitch-on-surface-variant/40"
          />
        </div>

        {error && (
          <div className="p-4.5 bg-rose-50 border border-rose-100 text-stitch-error rounded-2xl text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* History List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-5 border-stitch-outline-variant/60 bg-white rounded-2xl h-20 animate-pulse select-none" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="flex flex-col items-center justify-center text-center p-12 border border-stitch-outline-variant/60 rounded-3xl bg-white max-w-md mx-auto select-none">
            <History className="w-8 h-8 text-stitch-on-surface-variant/40 mb-3" />
            <h3 className="text-sm font-bold text-stitch-on-surface mb-1">No execution history</h3>
            <p className="text-xs text-stitch-on-surface-variant max-w-xs leading-relaxed">
              When you run any of the AI assistant planners, your interactions will be stored here automatically.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const isExpanded = expandedId === item.id;
              const isRegenerating = regeneratingId === item.id;
              const assistantResponse = messages.find(m => m.role === "assistant")?.content || "";
              
              return (
                <Card
                  key={item.id}
                  className={`border transition-all duration-300 bg-white rounded-2xl ${
                    isExpanded 
                      ? "border-stitch-primary/30 shadow-md" 
                      : "border-stitch-outline-variant/60 shadow-sm hover:shadow-md hover:border-stitch-outline-variant/90"
                  }`}
                >
                  {/* Item Header */}
                  <div
                    onClick={() => handleExpand(item.id)}
                    className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getToolBadgeColor(item.tool_type)}`}>
                          {item.tool_type.replace("-", " ")}
                        </span>
                        <span className="text-[10px] text-stitch-on-surface-variant font-semibold bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {getProjectName(item.project_id)}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-stitch-on-surface truncate pr-4">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-stitch-on-surface-variant font-medium">
                        <Calendar className="w-3.5 h-3.5 text-stitch-on-surface-variant/60" />
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleRegenerate(item.id, e)}
                        disabled={isRegenerating}
                        title="Regenerate recommendation"
                        className="p-2 border border-stitch-outline-variant/60 hover:border-stitch-primary hover:bg-stitch-primary/5 text-stitch-on-surface-variant hover:text-stitch-primary rounded-xl transition-all"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin text-stitch-primary" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete run"
                        className="p-2 border border-stitch-outline-variant/60 hover:border-stitch-error hover:bg-stitch-error/5 text-stitch-on-surface-variant hover:text-stitch-error rounded-xl transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-stitch-on-surface-variant">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-stitch-outline-variant/40 p-5 bg-stitch-background/10 space-y-4">
                      {detailLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                          <RefreshCw className="w-6 h-6 text-stitch-primary animate-spin" />
                          <span className="text-[10px] text-stitch-on-surface-variant font-semibold">Loading details...</span>
                        </div>
                      ) : (
                        <>
                          {/* Inputs Summary Card */}
                          <div className="space-y-1.5 select-text">
                            <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-stitch-on-surface-variant/80 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5" />
                              <span>Inputs Payload</span>
                            </h4>
                            <div className="p-3 bg-white border border-stitch-outline-variant/50 rounded-xl font-mono text-[10px] text-stitch-on-surface max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-sm">
                              {JSON.stringify(item.payload, null, 2)}
                            </div>
                          </div>

                          {/* Output Recommendation Card */}
                          <div className="space-y-1.5 flex-1 flex flex-col select-text">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-stitch-on-surface-variant/80 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-stitch-primary" />
                                <span>AI Recommendation Output</span>
                              </h4>

                              {/* Copy & Export actions */}
                              <div className="flex items-center gap-2 select-none">
                                <button
                                  onClick={() => handleCopy(assistantResponse, item.id)}
                                  className="px-2.5 py-1 text-[10px] font-bold border border-stitch-outline-variant/60 hover:bg-zinc-100 rounded-lg text-stitch-on-surface-variant flex items-center gap-1 transition-all"
                                >
                                  {copiedId === item.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span className="text-emerald-600 font-black">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => handleExportMarkdown(item, assistantResponse)}
                                  className="px-2.5 py-1 text-[10px] font-bold border border-stitch-outline-variant/60 hover:bg-zinc-100 rounded-lg text-stitch-on-surface-variant flex items-center gap-1 transition-all"
                                >
                                  <FileText className="w-3 h-3 text-indigo-500" />
                                  <span>MD</span>
                                </button>

                                <button
                                  onClick={() => handleExportJSON(item, assistantResponse)}
                                  className="px-2.5 py-1 text-[10px] font-bold border border-stitch-outline-variant/60 hover:bg-zinc-100 rounded-lg text-stitch-on-surface-variant flex items-center gap-1 transition-all"
                                >
                                  <FileJson className="w-3 h-3 text-amber-500" />
                                  <span>JSON</span>
                                </button>
                              </div>
                            </div>

                            <div className="p-4 bg-white border border-stitch-outline-variant/50 rounded-2xl text-xs text-stitch-on-surface leading-relaxed whitespace-pre-wrap font-sans max-h-80 overflow-y-auto shadow-sm select-text">
                              {assistantResponse || "No recommendation stored for this execution run."}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProjectLayout>
  );
};
