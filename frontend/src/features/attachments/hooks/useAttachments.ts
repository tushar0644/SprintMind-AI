import { useState, useEffect, useCallback } from 'react';
import { attachmentService, UploadAttachmentPayload } from '../services/attachmentService';
import { Attachment } from '../types';
import { useRealtime } from '../../../hooks/useRealtime';

export const useAttachments = (projectId: string, taskId?: string) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = taskId 
        ? await attachmentService.getTaskAttachments(taskId) 
        : await attachmentService.getProjectAttachments(projectId);
      setAttachments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load attachments');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // Realtime attachments updates subscription
  useRealtime({
    channelName: projectId ? `project-attachments-${projectId}` : 'project-attachments-empty',
    postgres: [
      {
        event: '*',
        schema: 'public',
        table: 'attachments',
        filter: projectId ? `project_id=eq.${projectId}` : undefined,
        callback: (payload: any) => {
          if (taskId) {
            if (payload.eventType === 'DELETE') {
              setAttachments((prev) => prev.filter((a) => a.id !== payload.old.id));
            } else if (payload.new && payload.new.task_id === taskId) {
              fetchAttachments();
            }
          } else {
            if (payload.eventType === 'DELETE') {
              setAttachments((prev) => prev.filter((a) => a.id !== payload.old.id));
            } else {
              fetchAttachments();
            }
          }
        },
      },
    ],
  });

  const uploadFile = async (payload: UploadAttachmentPayload) => {
    setIsUploading(true);
    try {
      const newAttachment = await attachmentService.uploadAttachment(payload);
      setAttachments(prev => [newAttachment, ...prev]);
      return newAttachment;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (attachmentId: string) => {
    setIsDeleting(true);
    try {
      await attachmentService.deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    attachments,
    isLoading,
    error,
    uploadFile,
    isUploading,
    deleteFile,
    isDeleting,
    refresh: fetchAttachments
  };
};
