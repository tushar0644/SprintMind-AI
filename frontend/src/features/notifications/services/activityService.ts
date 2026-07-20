import axios from "axios";
import { config } from "../../../config";
import { useAuthStore } from "../../../store/authStore";
import { PaginatedActivityLogs } from "../types";

const getHeaders = () => {
  const token = useAuthStore.getState().session?.access_token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const activityService = {
  getActivities: async (
    projectId: string, // Can be "all" for global dashboard view
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedActivityLogs> => {
    const url = `${config.apiUrl}/api/projects/${projectId}/activity?page=${page}&limit=${limit}`;
    const { data } = await axios.get<PaginatedActivityLogs>(url, getHeaders());
    return data;
  }
};
