import axios from "axios";
import { config } from "../../../config";
import { useAuthStore } from "../../../store/authStore";
import { PaginatedNotifications } from "../types";

const getHeaders = () => {
  const token = useAuthStore.getState().session?.access_token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const notificationsService = {
  getNotifications: async (
    page: number = 1,
    limit: number = 20,
    type?: string
  ): Promise<PaginatedNotifications> => {
    let url = `${config.apiUrl}/api/notifications?page=${page}&limit=${limit}`;
    if (type) {
      url += `&type=${type}`;
    }
    const { data } = await axios.get<PaginatedNotifications>(url, getHeaders());
    return data;
  },

  getUnreadCount: async (): Promise<number> => {
    const url = `${config.apiUrl}/api/notifications/unread-count`;
    const { data } = await axios.get<{ unread_count: number }>(url, getHeaders());
    return data.unread_count;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    const url = `${config.apiUrl}/api/notifications/${notificationId}/read`;
    await axios.patch(url, {}, getHeaders());
  },

  markAllAsRead: async (): Promise<void> => {
    const url = `${config.apiUrl}/api/notifications/read-all`;
    await axios.post(url, {}, getHeaders());
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    const url = `${config.apiUrl}/api/notifications/${notificationId}`;
    await axios.delete(url, getHeaders());
  }
};
