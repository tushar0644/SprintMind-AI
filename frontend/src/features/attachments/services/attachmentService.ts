import axios, { AxiosProgressEvent } from 'axios';
import { config } from '../../../config';
import { Attachment } from '../types';
import { useAuthStore } from '../../../store/authStore';

const getHeaders = () => {
  const token = useAuthStore.getState().session?.access_token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export interface UploadAttachmentPayload {
  projectId: string;
  taskId?: string;
  file: File;
  onProgress?: (progress: number) => void;
}

export const attachmentService = {
  async uploadAttachment(payload: UploadAttachmentPayload): Promise<Attachment> {
    const formData = new FormData();
    formData.append('project_id', payload.projectId);
    if (payload.taskId) {
      formData.append('task_id', payload.taskId);
    }
    formData.append('file', payload.file);

    const token = useAuthStore.getState().session?.access_token;
    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await axios.post<Attachment>(
      `${config.apiUrl}/api/v1/attachments/upload`,
      formData,
      {
        headers,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (payload.onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            payload.onProgress(percentCompleted);
          }
        },
      }
    );
    return response.data;
  },

  async getProjectAttachments(projectId: string): Promise<Attachment[]> {
    const response = await axios.get<Attachment[]>(
      `${config.apiUrl}/api/v1/attachments/project/${projectId}`,
      getHeaders()
    );
    return response.data;
  },

  async getTaskAttachments(taskId: string): Promise<Attachment[]> {
    const response = await axios.get<Attachment[]>(
      `${config.apiUrl}/api/v1/attachments/task/${taskId}`,
      getHeaders()
    );
    return response.data;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await axios.delete(
      `${config.apiUrl}/api/v1/attachments/${attachmentId}`,
      getHeaders()
    );
  }
};
