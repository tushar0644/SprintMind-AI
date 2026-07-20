import React, { useEffect, useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { aiService } from "../services/aiService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  Activity,
  Cpu,
  Zap,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon
} from "lucide-react";

interface AnalyticsData {
  total_requests: number;
  total_tokens: number;
  average_latency_ms: number;
  success_rate: number;
  feature_distribution: Record<string, number>;
  latency_by_feature: Record<string, number>;
  tokens_by_feature: Record<string, number>;
}

const COLORS = [
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#8b5cf6", // purple
  "#0ea5e9"  // sky
];

export const AIAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getAnalytics();
      setData(res);
    } catch (err: any) {
      setError("Failed to load AI analytics dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const requestChartData = data
    ? Object.keys(data.feature_distribution).map((key) => ({
        name: key.replace("-", " ").toUpperCase(),
        Requests: data.feature_distribution[key]
      }))
    : [];

  const tokenChartData = data
    ? Object.keys(data.tokens_by_feature).map((key) => ({
        name: key.replace("-", " ").toUpperCase(),
        value: data.tokens_by_feature[key]
      }))
    : [];

  const latencyChartData = data
    ? Object.keys(data.latency_by_feature).map((key) => ({
        name: key.replace("-", " ").toUpperCase(),
        "Latency (ms)": Math.round(data.latency_by_feature[key])
      }))
    : [];

  return (
    <ProjectLayout>
      <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="border-b border-stitch-outline-variant/60 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl font-bold tracking-tight text-stitch-on-surface font-sans">AI Analytics Dashboard</h1>
            </div>
            <p className="text-xs text-stitch-on-surface-variant mt-1">
              Visualize tokens usage, service latencies, success rates, and popular AI tools.
            </p>
          </div>
          <Button onClick={fetchAnalytics} variant="secondary" className="flex items-center gap-2 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        {error && (
          <div className="p-4.5 bg-rose-50 border border-rose-100 text-stitch-error rounded-2xl text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="p-5 border-stitch-outline-variant/60 bg-white rounded-2xl h-24 animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border-stitch-outline-variant/60 bg-white rounded-2xl h-80 animate-pulse" />
              <Card className="p-6 border-stitch-outline-variant/60 bg-white rounded-2xl h-80 animate-pulse" />
            </div>
          </div>
        ) : !data || data.total_requests === 0 ? (
          <Card className="flex flex-col items-center justify-center text-center p-12 border border-stitch-outline-variant/60 rounded-3xl bg-white max-w-md mx-auto select-none">
            <BarChart2 className="w-8 h-8 text-stitch-on-surface-variant/40 mb-3" />
            <h3 className="text-sm font-bold text-stitch-on-surface mb-1 font-sans">No analytics data</h3>
            <p className="text-xs text-stitch-on-surface-variant max-w-xs leading-relaxed">
              Run AI assistant tools in the workspace to generate execution metrics.
            </p>
          </Card>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Metric Summary Grid */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {/* Total Calls */}
              <Card className="flex flex-col justify-between p-5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-xl border bg-indigo-50 border-indigo-100 text-indigo-600">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[9px] uppercase font-extrabold tracking-wider text-stitch-on-surface-variant/70">
                    Total Requests
                  </p>
                  <p className="text-xl font-black text-stitch-on-surface mt-1 tracking-tight">
                    {data.total_requests}
                  </p>
                </div>
              </Card>

              {/* Total Tokens */}
              <Card className="flex flex-col justify-between p-5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-xl border bg-emerald-50 border-emerald-100 text-emerald-600">
                    <Cpu className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[9px] uppercase font-extrabold tracking-wider text-stitch-on-surface-variant/70">
                    Total Tokens
                  </p>
                  <p className="text-xl font-black text-stitch-on-surface mt-1 tracking-tight">
                    {data.total_tokens.toLocaleString()}
                  </p>
                </div>
              </Card>

              {/* Avg Latency */}
              <Card className="flex flex-col justify-between p-5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-xl border bg-amber-50 border-amber-100 text-amber-600">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[9px] uppercase font-extrabold tracking-wider text-stitch-on-surface-variant/70">
                    Avg Latency (ms)
                  </p>
                  <p className="text-xl font-black text-stitch-on-surface mt-1 tracking-tight">
                    {data.average_latency_ms} ms
                  </p>
                </div>
              </Card>

              {/* Success Rate */}
              <Card className="flex flex-col justify-between p-5 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-xl border bg-purple-50 border-purple-100 text-purple-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[9px] uppercase font-extrabold tracking-wider text-stitch-on-surface-variant/70">
                    Success Rate
                  </p>
                  <p className="text-xl font-black text-stitch-on-surface mt-1 tracking-tight">
                    {data.success_rate}%
                  </p>
                </div>
              </Card>
            </section>

            {/* Charts Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Requests Per Feature Bar Chart */}
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-stitch-primary" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-stitch-on-surface-variant">Tool Execution Counts</h2>
                </div>
                <div className="h-64 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={requestChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                      <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Requests" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Token Allocation Pie Chart */}
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-stitch-primary" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-stitch-on-surface-variant">Token Allocation</h2>
                </div>
                <div className="h-64 select-none flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tokenChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={75}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {tokenChartData.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 10 }} formatter={(val) => [`${val.toLocaleString()} tokens`, 'Usage']} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Average Latency Bar Chart */}
              <Card className="p-6 bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-stitch-on-surface-variant">Average response Latency (ms)</h2>
                </div>
                <div className="h-64 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={latencyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Latency (ms)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </section>
          </div>
        )}
      </div>
    </ProjectLayout>
  );
};
