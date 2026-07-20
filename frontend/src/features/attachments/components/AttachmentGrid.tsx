import React from 'react';
import { AttachmentCard } from './AttachmentCard';
import { Attachment } from '../types';

interface AttachmentGridProps {
  attachments: Attachment[];
  onDelete?: (id: string) => Promise<void>;
  onPreview?: (attachment: Attachment) => void;
}

export const AttachmentGrid: React.FC<AttachmentGridProps> = ({ attachments, onDelete, onPreview }) => {
  if (!attachments.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-stitch-on-surface-variant border border-dashed border-stitch-outline-variant rounded-xl bg-stitch-surface-container-low">
        <svg className="w-12 h-12 mb-3 text-stitch-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm font-medium">No attachments yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {attachments.map(att => (
        <AttachmentCard 
          key={att.id} 
          attachment={att} 
          onDelete={onDelete} 
          onPreview={onPreview} 
        />
      ))}
    </div>
  );
};
