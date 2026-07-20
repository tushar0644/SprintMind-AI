import React, { useEffect } from 'react';
import { Attachment } from '../types';

interface AttachmentPreviewProps {
  attachment: Attachment | null;
  onClose: () => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachment, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!attachment) return null;

  const isImage = attachment.content_type.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl max-h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-stitch-outline-variant bg-stitch-surface-container-low">
          <h3 className="text-sm font-bold text-stitch-on-surface truncate pr-4">
            {attachment.file_name}
          </h3>
          <div className="flex items-center gap-2">
            <a 
              href={attachment.url}
              download={attachment.file_name}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-stitch-primary hover:bg-stitch-primary/10 rounded-full transition-colors"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <button onClick={onClose} className="p-2 text-stitch-on-surface-variant hover:bg-stitch-outline-variant rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-stitch-surface-container-lowest min-h-[50vh]">
          {isImage ? (
            <img src={attachment.url} alt={attachment.file_name} className="max-w-full max-h-full object-contain" />
          ) : attachment.content_type === 'application/pdf' ? (
            <iframe src={attachment.url} className="w-full h-[70vh] rounded-md border-0" title={attachment.file_name} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12">
              <svg className="w-16 h-16 text-stitch-outline mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-stitch-on-surface font-medium mb-2">Preview not available</p>
              <p className="text-xs text-stitch-on-surface-variant mb-4">You can download this file to view it.</p>
              <a 
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-stitch-primary text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-colors"
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
