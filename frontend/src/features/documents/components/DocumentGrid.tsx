import React from 'react';
import { Document } from '../types';
import { DocumentCard } from './DocumentCard';
import { FileQuestion } from 'lucide-react';

interface DocumentGridProps {
  documents: Document[];
  isLoading: boolean;
  onPreview: (doc: Document) => void;
  onDelete: (id: string) => Promise<void>;
  searchQuery: string;
}

export const DocumentGrid: React.FC<DocumentGridProps> = ({ 
  documents, 
  isLoading, 
  onPreview, 
  onDelete,
  searchQuery
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-white border border-stitch-outline-variant/60 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-stitch-surface-container/5 rounded-2xl border border-stitch-outline-variant/40">
        <FileQuestion className="w-12 h-12 text-stitch-on-surface-variant/40 mb-3" />
        <h3 className="text-sm font-bold text-stitch-on-surface">No documents found</h3>
        <p className="text-xs text-stitch-on-surface-variant mt-1.5 max-w-sm">
          {searchQuery 
            ? "We couldn't find any documents matching your search query. Try typing something else." 
            : "No documents have been uploaded for this project yet. Use the drag-and-drop uploader above to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <DocumentCard 
          key={doc.id} 
          document={doc} 
          onPreview={onPreview} 
          onDelete={onDelete} 
        />
      ))}
    </div>
  );
};
