import { useState, useEffect, useCallback } from 'react';
import { documentService, UploadDocumentPayload } from '../services/documentService';
import { Document } from '../types';
import { useRealtime } from '../../../hooks/useRealtime';

export const useDocuments = (projectId: string) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChunking, setIsChunking] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!projectId) {
      setDocuments([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await documentService.getProjectDocuments(projectId);
      setDocuments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Realtime updates subscription
  useRealtime({
    channelName: projectId ? `project-documents-${projectId}` : 'project-documents-empty',
    postgres: [
      {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: projectId ? `project_id=eq.${projectId}` : undefined,
        callback: (payload: any) => {
          if (payload.eventType === 'DELETE') {
            setDocuments((prev) => prev.filter((d) => d.id !== payload.old.id));
          } else {
            fetchDocuments();
          }
        },
      },
    ],
  });

  const uploadFile = async (payload: UploadDocumentPayload) => {
    setIsUploading(true);
    try {
      const newDocument = await documentService.uploadDocument(payload);
      setDocuments(prev => [newDocument, ...prev]);
      return newDocument;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (documentId: string) => {
    setIsDeleting(true);
    try {
      await documentService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(d => d.id !== documentId));
    } finally {
      setIsDeleting(false);
    }
  };

  const chunkDocument = async (
    documentId: string,
    maxChunkSize?: number,
    minChunkSize?: number,
    overlap?: number
  ) => {
    setIsChunking(true);
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === documentId
          ? { ...d, processing_status: 'Processing...' }
          : d
      )
    );
    try {
      await documentService.chunkDocument(documentId, maxChunkSize, minChunkSize, overlap);
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to process semantic chunks');
      await fetchDocuments();
      throw err;
    } finally {
      setIsChunking(false);
    }
  };

  return {
    documents,
    isLoading,
    error,
    uploadFile,
    isUploading,
    deleteFile,
    isDeleting,
    chunkDocument,
    isChunking,
    refresh: fetchDocuments
  };
};
