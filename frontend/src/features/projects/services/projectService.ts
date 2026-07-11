import axios from "axios";
import { config } from "../../../config";
import { Project } from "../types";
import { useAuthStore } from "../../../store/authStore";

const getHeaders = () => {
  const token = useAuthStore.getState().session?.access_token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const projectService = {
  getProjects: async (): Promise<Project[]> => {
    const { data } = await axios.get<Project[]>(`${config.apiUrl}/api/projects`, getHeaders());
    return data;
  },
  createProject: async (name: string, description?: string, status?: "active" | "archived"): Promise<Project> => {
    const { data } = await axios.post<Project>(
      `${config.apiUrl}/api/projects`,
      { name, description, status: status || "active" },
      getHeaders()
    );
    return data;
  },
  updateProject: async (id: string, name?: string, description?: string, status?: "active" | "archived"): Promise<Project> => {
    const { data } = await axios.patch<Project>(
      `${config.apiUrl}/api/projects/${id}`,
      { name, description, status },
      getHeaders()
    );
    return data;
  },
  deleteProject: async (id: string): Promise<void> => {
    await axios.delete(`${config.apiUrl}/api/projects/${id}`, getHeaders());
  }
};
