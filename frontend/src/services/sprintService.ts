import axios from "axios";
import { config } from "../config";
import { useAuthStore } from "../store/authStore";
import { Sprint } from "../types/Sprint";
import { SprintPlanResponse } from "../types/SprintPlanResponse";

const getHeaders = () => {
  const token = useAuthStore.getState().session?.access_token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const sprintService = {
  /**
   * Triggers the backend AI/algorithm sprint planning engine for a given project.
   * POST /projects/{project_id}/plan-sprints
   */
  planSprints: async (projectId: string, capacity: number = 20): Promise<SprintPlanResponse> => {
    const { data } = await axios.post<SprintPlanResponse>(
      `${config.apiUrl}/api/projects/${projectId}/plan-sprints`,
      { capacity },
      getHeaders()
    );
    return data;
  },

  /**
   * Retrieves current sprint plan structure and sprint assignments for a given project.
   * GET /projects/{project_id}/sprints
   */
  getSprints: async (projectId: string): Promise<Sprint[]> => {
    const { data } = await axios.get<Sprint[]>(
      `${config.apiUrl}/api/projects/${projectId}/sprints`,
      getHeaders()
    );
    return data;
  },
};

export default sprintService;
