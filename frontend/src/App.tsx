import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicRoute } from "./components/PublicRoute";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Verify } from "./pages/Verify";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./features/projects/pages/Projects";
import { Tasks } from "./features/tasks/pages/Tasks";
import { Settings } from "./pages/Settings";
import { AIOverview } from "./features/ai/pages/AIOverview";
import { SprintPlanner } from "./features/ai/pages/SprintPlanner";
import { ProjectHealth } from "./features/ai/pages/ProjectHealth";
import { TaskPrioritizer } from "./features/ai/pages/TaskPrioritizer";
import { MeetingNotes } from "./features/ai/pages/MeetingNotes";
import { DailyStandup } from "./features/ai/pages/DailyStandup";
import { RiskAnalysis } from "./features/ai/pages/RiskAnalysis";
import { AIHistory } from "./features/ai/pages/AIHistory";
import { AIAnalytics } from "./features/ai/pages/AIAnalytics";
import { Notifications } from "./features/notifications/pages/Notifications";
import { ProjectFilesPage } from "./features/attachments/components/ProjectFilesPage";
import { DocumentsPage } from "./features/documents/pages/DocumentsPage";

// Custom Error Boundary Component to prevent application blank screens
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught unhandled rendering exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 p-6">
          <div className="max-w-xl w-full border border-red-500/20 bg-zinc-900/30 rounded-xl p-8 text-center shadow-lg">
            <div className="w-16 h-16 bg-red-600/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1 className="text-2xl font-extrabold text-zinc-50 mb-2">Something went wrong</h1>
            <p className="text-sm text-zinc-400 mb-6 font-mono">
              The application encountered a critical runtime error and was unable to proceed.
            </p>

            <div className="border border-zinc-800 bg-zinc-950/50 rounded-lg p-4 text-left font-mono text-xs text-red-400 mb-6 max-h-40 overflow-auto select-text">
              {this.state.error?.toString() || "Unknown Error"}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-50 rounded-lg text-sm font-medium transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
            <Route path="/verify" element={<PublicRoute><Verify /></PublicRoute>} />

            {/* Protected Dashboard Route */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/files"
              element={
                <ProtectedRoute>
                  <ProjectFilesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai"
              element={
                <ProtectedRoute>
                  <AIOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/sprint-planner"
              element={
                <ProtectedRoute>
                  <SprintPlanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/project-health"
              element={
                <ProtectedRoute>
                  <ProjectHealth />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/task-prioritizer"
              element={
                <ProtectedRoute>
                  <TaskPrioritizer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/meeting-notes"
              element={
                <ProtectedRoute>
                  <MeetingNotes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/daily-standup"
              element={
                <ProtectedRoute>
                  <DailyStandup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/risk-analysis"
              element={
                <ProtectedRoute>
                  <RiskAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/history"
              element={
                <ProtectedRoute>
                  <AIHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/analytics"
              element={
                <ProtectedRoute>
                  <AIAnalytics />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />

            {/* Fallbacks */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
