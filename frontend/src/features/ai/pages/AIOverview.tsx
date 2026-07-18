import React from "react";
import { Link } from "react-router-dom";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import {
  Sparkles,
  Calendar,
  HeartPulse,
  Signal,
  FileText,
  UserCheck,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

export const AIOverview: React.FC = () => {
  const assistants = [
    {
      to: "/ai/sprint-planner",
      label: "Sprint Planner",
      desc: "Input project objectives and retrieve fully structured backlog suggestions, estimates, and sprint timelines.",
      icon: Calendar,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      to: "/ai/project-health",
      label: "Project Health Controller",
      desc: "Analyze project baselines and task density to highlight warning flags, bottleneck ratios, and remediation routes.",
      icon: HeartPulse,
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
    {
      to: "/ai/task-prioritizer",
      label: "Task Prioritizer",
      desc: "Evaluate list elements using AI reasoning to classify items into priority vectors and optimize resource allocation.",
      icon: Signal,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      to: "/ai/meeting-notes",
      label: "Meeting Summarizer",
      desc: "Upload meeting transcripts to extract bullet summaries, decisions log, action items, and task assignments.",
      icon: FileText,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      to: "/ai/daily-standup",
      label: "Standup Reporter",
      desc: "Format daily standups detailing completed work, planned items, and impediments into a professional update summary.",
      icon: UserCheck,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      to: "/ai/risk-analysis",
      label: "Risk Analyzer",
      desc: "Assess scope creep indicators, resource constraints, and milestone risk metrics dynamically with likelihood ranks.",
      icon: ShieldAlert,
      color: "text-sky-600 bg-sky-50 border-sky-100",
    },
  ];

  return (
    <ProjectLayout>
      <div className="space-y-8 max-w-6xl mx-auto px-4 md:px-6 py-6 min-h-[500px]">
        {/* Welcome Header */}
        <section className="flex flex-col md:flex-row md:items-center justify-between border-b border-stitch-outline-variant/50 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-stitch-primary animate-pulse" />
              <h1 className="text-2xl font-bold text-stitch-on-surface tracking-tight font-sans">
                AI Sprint Assistant
              </h1>
            </div>
            <p className="text-xs text-stitch-on-surface-variant mt-1.5 leading-relaxed font-medium">
              Accelerate your project management workflows using Gemini-powered intelligence agents.
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((ast, idx) => (
            <Card
              key={idx}
              className="flex flex-col justify-between p-6 bg-white border border-stitch-outline-variant/60 rounded-3xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 group"
            >
              <div className="space-y-4">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${ast.color}`}>
                  <ast.icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-stitch-on-surface font-sans">
                    {ast.label}
                  </h3>
                  <p className="text-xs text-stitch-on-surface-variant leading-relaxed select-text">
                    {ast.desc}
                  </p>
                </div>
              </div>
              
              <Link to={ast.to} className="mt-6 block">
                <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-2 rounded-xl font-bold group-hover:bg-stitch-primary group-hover:text-white transition-all duration-300">
                  <span>Open Tool</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </Card>
          ))}
        </section>
      </div>
    </ProjectLayout>
  );
};
