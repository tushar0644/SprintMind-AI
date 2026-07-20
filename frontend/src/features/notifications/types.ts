export interface Notification {
  id: string;
  user_id: string;
  sender_id: string | null;
  title: string;
  message: string;
  type: 'task' | 'project' | 'ai' | 'comment';
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  sender_display_name: string | null;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string | null;
  action: string;
  entity_type: 'project' | 'task' | 'comment' | 'ai';
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  user_display_name: string | null;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total_count: number;
  page: number;
  limit: number;
}

export interface PaginatedActivityLogs {
  activities: ActivityLog[];
  total_count: number;
  page: number;
  limit: number;
}
