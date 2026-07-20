import axios from "axios";
import { config } from "../../../config";
import { useAuthStore } from "../../../store/authStore";
import {
  Comment,
  CommentCreatePayload,
  CommentUpdatePayload,
  PaginatedComments
} from "../types";

const getHeaders = () => {
  const token = useAuthStore.getState().session?.access_token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const commentsService = {
  getComments: async (
    taskId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedComments> => {
    const url = `${config.apiUrl}/api/comments?task_id=${taskId}&page=${page}&limit=${limit}`;
    const { data } = await axios.get<PaginatedComments>(url, getHeaders());
    return data;
  },

  createComment: async (payload: CommentCreatePayload): Promise<Comment> => {
    const url = `${config.apiUrl}/api/comments`;
    const { data } = await axios.post<Comment>(url, payload, getHeaders());
    return data;
  },

  updateComment: async (
    commentId: string,
    payload: CommentUpdatePayload
  ): Promise<Comment> => {
    const url = `${config.apiUrl}/api/comments/${commentId}`;
    const { data } = await axios.patch<Comment>(url, payload, getHeaders());
    return data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    const url = `${config.apiUrl}/api/comments/${commentId}`;
    await axios.delete(url, getHeaders());
  },

  toggleReaction: async (
    commentId: string,
    emoji: string
  ): Promise<{ active: boolean }> => {
    const url = `${config.apiUrl}/api/comments/${commentId}/reactions`;
    const { data } = await axios.post<{ active: boolean }>(
      url,
      { emoji },
      getHeaders()
    );
    return data;
  }
};
