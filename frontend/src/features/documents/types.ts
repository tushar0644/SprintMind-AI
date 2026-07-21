export interface Document {
  id: string;
  project_id: string;
  uploader_id: string;
  file_name: string;
  file_size: number;
  content_type: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
  url?: string;
  chunk_count?: number;
  avg_chunk_size?: number;
  processing_status?: string;
}

export interface DocumentAnalysis {
  id: string;
  document_id: string;
  status: 'Pending' | 'Analyzing' | 'Completed' | 'Failed';
  executive_summary?: string;
  objectives?: string[];
  deliverables?: string[];
  timeline?: string[];
  risks?: string[];
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequirements {
  id: string;
  document_id: string;
  functional_requirements: string[];
  non_functional_requirements: string[];
  business_rules: string[];
  assumptions: string[];
  dependencies: string[];
  risks: string[];
  created_at: string;
  updated_at: string;
}

export interface DocumentStory {
  id: string;
  epic_id: string;
  document_id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  priority: 'High' | 'Medium' | 'Low';
  story_points: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentEpic {
  id: string;
  document_id: string;
  title: string;
  description?: string;
  stories: DocumentStory[];
  created_at: string;
  updated_at: string;
}

export interface ProjectGenerationSummary {
  project_id: string;
  project_name: string;
  epics_count: number;
  tasks_count: number;
}
