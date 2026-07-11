import { useState, useEffect, useCallback } from "react";
import { Task, TaskCreatePayload, TaskUpdatePayload } from "../types";
import { taskService } from "../services/taskService";

export const useTasks = (projectId?: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskService.getTasks(projectId);
      setTasks(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (payload: TaskCreatePayload) => {
    setError(null);
    try {
      await taskService.createTask(payload);
      await fetchTasks();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to create task.";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const updateTask = async (taskId: string, payload: TaskUpdatePayload) => {
    setError(null);
    try {
      await taskService.updateTask(taskId, payload);
      await fetchTasks();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to update task.";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const deleteTask = async (taskId: string) => {
    setError(null);
    try {
      await taskService.deleteTask(taskId);
      await fetchTasks();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to delete task.";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  return {
    tasks,
    loading,
    error,
    setError,
    refresh: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
};
