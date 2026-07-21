import { Sprint } from "./Sprint";

export interface SprintPlanResponse {
  project_id: string;
  capacity: number;
  sprints_count: number;
  tasks_scheduled: number;
  tasks_unscheduled: number;
  sprints: Sprint[];
}
