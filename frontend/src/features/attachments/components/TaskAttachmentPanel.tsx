import React, { useState } from 'react';
import { useAttachments } from '../hooks/useAttachments';
import { AttachmentUploader } from './AttachmentUploader';
import { AttachmentPreview } from './AttachmentPreview';
import { Attachment } from '../types';
import { Paperclip, X, File, Trash2, Download } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

interface TaskAttachmentPanelProps {
  projectId: string;
  taskId: string;
  onClose?: () => void;
}

export const TaskAttachmentPanel: React.FC<TaskAttachmentPanelProps> = ({ projectId, taskId, onClose }) => {
  const { attachments, isLoading, error, uploadFile, deleteFile } = useAttachments(projectId, taskId);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const handleUpload = async (file: File, onProgress: (p: number) => void) => {
    await uploadFile({ projectId, file, taskId, onProgress });
  };

  return (
    <Card className="flex flex-col bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm h-full max-h-[500px]">
      <div className="flex items-center justify-between p-4 border-b border-stitch-outline-variant/60">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-stitch-on-surface-variant" />
          <h3 className="font-bold text-stitch-on-surface text-sm">Task Attachments</h3>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-stitch-on-surface-variant/60 hover:text-stitch-error hover:bg-red-50 transition-all duration-200">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AttachmentUploader onUpload={handleUpload} multiple={true} />

        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="w-6 h-6 border-2 border-stitch-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">{error}</div>
        ) : attachments && attachments.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stitch-on-surface-variant">Files ({attachments.length})</h4>
            <div className="grid grid-cols-1 gap-2">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-3 p-2 bg-stitch-surface-container/20 border border-stitch-outline-variant/60 rounded-xl hover:border-stitch-primary/30 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-stitch-primary/10 flex items-center justify-center text-stitch-primary shrink-0">
                    <File className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewAttachment(att)}>
                    <p className="text-xs font-bold text-stitch-on-surface truncate">{att.file_name}</p>
                    <p className="text-[10px] text-stitch-on-surface-variant">{(att.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                     <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-stitch-on-surface-variant/60 hover:text-stitch-primary hover:bg-stitch-surface-container transition-all" title="Download">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button type="button" onClick={() => deleteFile(att.id)} className="p-1.5 rounded-lg text-stitch-on-surface-variant/60 hover:text-stitch-error hover:bg-stitch-surface-container transition-all" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
           <p className="text-xs text-stitch-on-surface-variant/60 text-center py-4">No attachments yet</p>
        )}
      </div>
      
      {previewAttachment && (
        <AttachmentPreview attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      )}
    </Card>
  );
};
