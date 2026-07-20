import React, { useEffect, useState } from 'react';
import { Document } from '../types';
import { X, Download, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface DocumentViewerProps {
  document: Document | null;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      setTextContent(null);
      setTextError(null);
      return;
    }

    const type = document.content_type.toLowerCase();
    const isText = type.startsWith('text/') || 
                   type.includes('json') || 
                   type.includes('javascript') || 
                   type.includes('typescript') || 
                   type.includes('xml');

    if (isText && document.url) {
      setTextLoading(true);
      setTextError(null);
      fetch(document.url)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch text content');
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setTextLoading(false);
        })
        .catch((err) => {
          setTextError(err.message || 'Failed to load text preview');
          setTextLoading(false);
        });
    } else {
      setTextContent(null);
    }
  }, [document]);

  if (!document) return null;

  const isImage = document.content_type.toLowerCase().startsWith('image/');
  const isPdf = document.content_type.toLowerCase() === 'application/pdf';
  const isText = textContent !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm select-none" onClick={onClose}>
      <div 
        className="relative w-full max-w-5xl h-[85vh] bg-white border border-stitch-outline-variant rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stitch-outline-variant/60 flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-stitch-on-surface truncate" title={document.file_name}>
              {document.file_name}
            </h2>
            <p className="text-[10px] text-stitch-on-surface-variant/80 mt-0.5">
              {document.content_type}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {document.url && (
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl font-bold flex items-center gap-1.5"
                onClick={() => window.open(document.url, '_blank')}
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </Button>
            )}
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="p-1.5 hover:bg-stitch-surface-container-high rounded-xl text-stitch-on-surface-variant hover:text-stitch-on-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto bg-stitch-background p-6 flex items-center justify-center">
          {isImage && document.url && (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img 
                src={document.url} 
                alt={document.file_name} 
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border border-stitch-outline-variant/50" 
              />
            </div>
          )}

          {isPdf && document.url && (
            <iframe 
              src={document.url} 
              title={document.file_name}
              className="w-full h-full border-0 rounded-lg shadow-inner bg-white"
            />
          )}

          {isText && (
            <div className="w-full h-full bg-white border border-stitch-outline-variant/60 rounded-lg shadow-sm p-4 overflow-auto font-mono text-xs text-stitch-on-surface text-left">
              {textLoading ? (
                <div className="h-full flex items-center justify-center text-stitch-on-surface-variant animate-pulse">
                  Loading text content...
                </div>
              ) : textError ? (
                <div className="h-full flex flex-col items-center justify-center text-stitch-error gap-2">
                  <AlertCircle className="w-8 h-8" />
                  <span>{textError}</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap select-text">{textContent}</pre>
              )}
            </div>
          )}

          {!isImage && !isPdf && !isText && (
            <div className="flex flex-col items-center text-center p-8 max-w-sm bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm">
              <div className="p-4 bg-stitch-surface-container/50 rounded-full mb-4 text-stitch-on-surface-variant">
                <FileText className="w-12 h-12" />
              </div>
              <h3 className="text-sm font-bold text-stitch-on-surface">No preview available</h3>
              <p className="text-xs text-stitch-on-surface-variant/80 mt-1.5 mb-6 leading-relaxed">
                We don't support online previews for this file format ({document.content_type}). Please download the document to view it on your local system.
              </p>
              {document.url && (
                <Button
                  variant="primary"
                  size="md"
                  className="rounded-xl font-bold flex items-center gap-2"
                  onClick={() => window.open(document.url, '_blank')}
                >
                  <Download className="w-4 h-4" />
                  <span>Download Document</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
