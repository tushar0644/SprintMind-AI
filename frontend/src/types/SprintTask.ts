export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface SprintTask {
  id: string;
  project_id: string;
  owner_id: string;
  assignee_id?: string | null;
  sprint_id?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  epic_id?: string | null;
  story_points?: number | null;
  checklist?: string[] | null;
  depends_on?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
