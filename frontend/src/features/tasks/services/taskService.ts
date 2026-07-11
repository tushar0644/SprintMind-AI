import axios from "axios";
import { config } from "../../../config";
import { Task, TaskCreatePayload, TaskUpdatePayload } from "../types";
import { useAuthStore } from "../../../store/authStore";

const getHeaders = () => {
  const token = useAuthStore.getState().session?.access_token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const taskService = {
  getTasks: async (projectId?: string): Promise<Task[]> => {
    const url = projectId
      ? `${config.apiUrl}/api/tasks?project_id=${projectId}`
      : `${config.apiUrl}/api/tasks`;
    const { data } = await axios.get<Task[]>(url, getHeaders());
    return data;
  },

  getTask: async (taskId: string): Promise<Task> => {
    const { data } = await axios.get<Task>(
      `${config.apiUrl}/api/tasks/${taskId}`,
      getHeaders()
    );
    return data;
  },

  createTask: async (payload: TaskCreatePayload): Promise<Task> => {
    const { data } = await axios.post<Task>(
      `${config.apiUrl}/api/tasks`,
      payload,
      getHeaders()
    );
    return data;
  },

  updateTask: async (taskId: string, payload: TaskUpdatePayload): Promise<Task> => {
    const { data } = await axios.patch<Task>(
      `${config.apiUrl}/api/tasks/${taskId}`,
      payload,
      getHeaders()
    );
    return data;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await axios.delete(`${config.apiUrl}/api/tasks/${taskId}`, getHeaders());
  },
};
