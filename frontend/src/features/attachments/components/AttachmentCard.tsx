import React, { useState } from 'react';
import { Attachment } from '../types';

interface AttachmentCardProps {
  attachment: Attachment;
  onDelete?: (id: string) => Promise<void>;
  onPreview?: (attachment: Attachment) => void;
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment, onDelete, onPreview }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const isImage = attachment.content_type.startsWith('image/');
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(attachment.id);
    } catch (error) {
      console.error('Failed to delete', error);
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="relative group flex flex-col items-center justify-center p-4 border border-stitch-outline-variant rounded-xl bg-white hover:border-stitch-primary hover:shadow-md transition-all cursor-pointer overflow-hidden"
      onClick={() => onPreview && onPreview(attachment)}
    >
      <div className="w-16 h-16 flex items-center justify-center mb-3 text-stitch-on-surface-variant">
        {isImage ? (
          <img src={attachment.url} alt={attachment.file_name} className="object-cover w-full h-full rounded-md" />
        ) : (
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <div className="w-full text-center">
        <h4 className="text-xs font-semibold text-stitch-on-surface truncate px-2" title={attachment.file_name}>
          {attachment.file_name}
        </h4>
        <p className="text-[10px] text-stitch-on-surface-variant mt-1">
          {formatBytes(attachment.file_size)}
        </p>
      </div>

      {onDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 disabled:opacity-50 shadow-sm"
          title="Delete attachment"
        >
          {isDeleting ? (
             <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
             </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};
