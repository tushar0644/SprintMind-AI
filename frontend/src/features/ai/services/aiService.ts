import axios from "axios";
import { config } from "../../../config";
import { useAuthStore } from "../../../store/authStore";

const getHeaders = () => {
  const token = useAuthStore.getState().session?.access_token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const aiService = {
  generateSprintPlan: async (projectContext: string, objectives: string): Promise<string> => {
    const { data } = await axios.post<{ plan: string }>(
      `${config.apiUrl}/api/ai/sprint-plan`,
      { project_context: projectContext, objectives },
      getHeaders()
    );
    return data.plan;
  },

  analyzeProjectHealth: async (projectDetails: string, tasks: any[] = []): Promise<string> => {
    const { data } = await axios.post<{ analysis: string }>(
      `${config.apiUrl}/api/ai/project-health`,
      { project_details: projectDetails, tasks },
      getHeaders()
    );
    return data.analysis;
  },

  prioritizeTasks: async (tasks: any[]): Promise<string> => {
    const { data } = await axios.post<{ prioritization: string }>(
      `${config.apiUrl}/api/ai/prioritize`,
      { tasks },
      getHeaders()
    );
    return data.prioritization;
  },

  summarizeMeetingNotes: async (transcript: string): Promise<string> => {
    const { data } = await axios.post<{ summary: string }>(
      `${config.apiUrl}/api/ai/meeting-notes`,
      { transcript },
      getHeaders()
    );
    return data.summary;
  },

  generateDailyStandup: async (completed: string[], planned: string[], blockers: string[]): Promise<string> => {
    const { data } = await axios.post<{ report: string }>(
      `${config.apiUrl}/api/ai/daily-standup`,
      { completed, planned, blockers },
      getHeaders()
    );
    return data.report;
  },

  analyzeRisks: async (projectScope: string, timeline: string): Promise<string> => {
    const { data } = await axios.post<{ analysis: string }>(
      `${config.apiUrl}/api/ai/risk-analysis`,
      { project_scope: projectScope, timeline },
      getHeaders()
    );
    return data.analysis;
  },
};
