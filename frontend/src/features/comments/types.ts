export interface CommentReaction {
  user_id: string;
  emoji: string;
  user_display_name?: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  user_display_name?: string;
  user_avatar_url?: string;
  reactions: CommentReaction[];
  replies: Comment[];
}

export interface CommentCreatePayload {
  task_id: string;
  content: string;
  parent_id?: string | null;
}

export interface CommentUpdatePayload {
  content: string;
}

export interface PaginatedComments {
  comments: Comment[];
  total_count: number;
  page: number;
  limit: number;
}
