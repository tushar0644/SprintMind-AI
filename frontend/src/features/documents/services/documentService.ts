import axios, { AxiosProgressEvent } from 'axios';
import { config } from '../../../config';
import { Document, DocumentAnalysis, DocumentRequirements, DocumentEpic, ProjectGenerationSummary } from '../types';
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
  },

  async chunkDocument(
    documentId: string,
    maxChunkSize = 1000,
    minChunkSize = 100,
    overlap = 200
  ): Promise<any[]> {
    const response = await axios.post<any[]>(
      `${config.apiUrl}/api/v1/documents/${documentId}/chunk`,
      { max_chunk_size: maxChunkSize, min_chunk_size: minChunkSize, overlap },
      getHeaders()
    );
    return response.data;
  },

  async getDocumentChunks(documentId: string): Promise<any[]> {
    const response = await axios.get<any[]>(
      `${config.apiUrl}/api/v1/documents/${documentId}/chunks`,
      getHeaders()
    );
    return response.data;
  },

  async analyzeDocument(documentId: string): Promise<DocumentAnalysis> {
    const response = await axios.post<DocumentAnalysis>(
      `${config.apiUrl}/api/v1/documents/${documentId}/analyze`,
      {},
      getHeaders()
    );
    return response.data;
  },

  async getDocumentAnalysis(documentId: string): Promise<DocumentAnalysis> {
    const response = await axios.get<DocumentAnalysis>(
      `${config.apiUrl}/api/v1/documents/${documentId}/analysis`,
      getHeaders()
    );
    return response.data;
  },

  async extractDocumentRequirements(documentId: string): Promise<DocumentRequirements> {
    const response = await axios.post<DocumentRequirements>(
      `${config.apiUrl}/api/v1/documents/${documentId}/requirements`,
      {},
      getHeaders()
    );
    return response.data;
  },

  async getDocumentRequirements(documentId: string): Promise<DocumentRequirements> {
    const response = await axios.get<DocumentRequirements>(
      `${config.apiUrl}/api/v1/documents/${documentId}/requirements`,
      getHeaders()
    );
    return response.data;
  },

  async generateDocumentStories(documentId: string): Promise<DocumentEpic[]> {
    const response = await axios.post<DocumentEpic[]>(
      `${config.apiUrl}/api/v1/documents/${documentId}/stories`,
      {},
      getHeaders()
    );
    return response.data;
  },

  async getDocumentStories(documentId: string): Promise<DocumentEpic[]> {
    const response = await axios.get<DocumentEpic[]>(
      `${config.apiUrl}/api/v1/documents/${documentId}/stories`,
      getHeaders()
    );
    return response.data;
  },

  async generateProjectFromDocument(documentId: string): Promise<ProjectGenerationSummary> {
    const response = await axios.post<ProjectGenerationSummary>(
      `${config.apiUrl}/api/v1/documents/${documentId}/generate-project`,
      {},
      getHeaders()
    );
    return response.data;
  },

  async getGeneratedProjectSummary(projectId: string): Promise<ProjectGenerationSummary> {
    const response = await axios.get<ProjectGenerationSummary>(
      `${config.apiUrl}/api/v1/projects/${projectId}/generated`,
      getHeaders()
    );
    return response.data;
  }
};

