export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
