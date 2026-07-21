import { SprintTask } from "./SprintTask";

export type SprintStatus = "planned" | "active" | "completed" | string;

export interface Sprint {
  id: string;
  project_id: string;
  sprint_number: number;
  name: string;
  capacity: number;
  total_points: number;
  status: SprintStatus;
  tasks: SprintTask[];
  created_at: string;
  updated_at: string;
}
