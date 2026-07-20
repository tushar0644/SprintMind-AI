import axios, { AxiosProgressEvent } from 'axios';
import { config } from '../../../config';
import { Document } from '../types';
import { useAuthStore } from '../../../store/authStore';

const getHeaders = () => {
  const token = useAuthStore.getState().session?.access_token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export interface UploadDocumentPayload {
  projectId: string;
  file: File;
  onProgress?: (progress: number) => void;
}

export const documentService = {
  async uploadDocument(payload: UploadDocumentPayload): Promise<Document> {
    const formData = new FormData();
    formData.append('project_id', payload.projectId);
    formData.append('file', payload.file);

    const token = useAuthStore.getState().session?.access_token;
    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await axios.post<Document>(
      `${config.apiUrl}/api/v1/documents/upload`,
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

  async getProjectDocuments(projectId: string): Promise<Document[]> {
    const response = await axios.get<Document[]>(
      `${config.apiUrl}/api/v1/documents/project/${projectId}`,
      getHeaders()
    );
    return response.data;
  },

  async getDocumentMetadata(documentId: string): Promise<Document> {
    const response = await axios.get<Document>(
      `${config.apiUrl}/api/v1/documents/${documentId}`,
      getHeaders()
    );
    return response.data;
  },

  async deleteDocument(documentId: string): Promise<void> {
    await axios.delete(
      `${config.apiUrl}/api/v1/documents/${documentId}`,
      getHeaders()
    );
  }
};
