export interface Attachment {
  id: string;
  project_id: string;
  task_id: string | null;
  uploader_id: string;
  file_name: string;
  file_size: number;
  content_type: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
  url: string;
}
