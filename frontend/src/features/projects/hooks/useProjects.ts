import { useState, useEffect } from "react";
import { Project } from "../types";
import { projectService } from "../services/projectService";

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createProject = async (name: string, description?: string, status?: "active" | "archived") => {
    setError(null);
    try {
      await projectService.createProject(name, description, status);
      await fetchProjects();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to create project.";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const updateProject = async (id: string, name?: string, description?: string, status?: "active" | "archived") => {
    setError(null);
    try {
      await projectService.updateProject(id, name, description, status);
      await fetchProjects();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to update project.";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const deleteProject = async (id: string) => {
    setError(null);
    try {
      await projectService.deleteProject(id);
      await fetchProjects();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to delete project.";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  return {
    projects,
    loading,
    error,
    setError,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject
  };
};
