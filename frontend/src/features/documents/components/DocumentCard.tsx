import React from 'react';
import { Document } from '../types';
import { Card } from '../../../components/ui/Card';
import { 
  FileText, 
  FileImage, 
  FileSpreadsheet, 
  FileCode, 
  FileArchive,
  File, 
  Download, 
  Trash2, 
  Eye,
  Cpu
} from 'lucide-react';

interface DocumentCardProps {
  document: Document;
  onPreview: (doc: Document) => void;
  onDelete: (id: string) => Promise<void>;
  onChunk?: (id: string) => Promise<void>;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onPreview, onDelete, onChunk }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isChunking, setIsChunking] = React.useState(false);

  const isSupportedFormat = (contentType: string, fileName: string) => {
    const type = contentType.toLowerCase();
    const ext = fileName.split('.').pop()?.toLowerCase();
    return type === 'application/pdf' || 
           type.includes('word') || 
           type.includes('officedocument.wordprocessingml') || 
           type.includes('text') || 
           ext === 'md' || 
           ext === 'markdown' || 
           ext === 'txt' || 
           ext === 'pdf' || 
           ext === 'docx';
  };

  const handleChunk = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onChunk) return;
    setIsChunking(true);
    try {
      await onChunk(document.id);
    } catch (err) {
      // hook handles UI errors
    } finally {
      setIsChunking(false);
    }
  };

  const getFileIcon = (contentType: string) => {
    const type = contentType.toLowerCase();
    if (type.startsWith('image/')) return <FileImage className="w-8 h-8 text-indigo-500" />;
    if (type === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv') || type.includes('sheet')) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    }
    if (type.includes('json') || type.includes('javascript') || type.includes('typescript') || type.includes('html') || type.includes('css')) {
      return <FileCode className="w-8 h-8 text-amber-500" />;
    }
    if (type.includes('zip') || type.includes('tar') || type.includes('rar') || type.includes('7z') || type.includes('compressed')) {
      return <FileArchive className="w-8 h-8 text-amber-600" />;
    }
    return <File className="w-8 h-8 text-zinc-400" />;
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${document.file_name}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(document.id);
      } catch (err) {
        setIsDeleting(false);
      }
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.url) {
      window.open(document.url, '_blank');
    }
  };

  return (
    <Card 
      onClick={() => onPreview(document)}
      className={`p-4 bg-white border border-stitch-outline-variant/60 rounded-2xl hover:shadow-md hover:border-stitch-primary/30 transition-all duration-300 flex items-center gap-4 cursor-pointer relative group ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="p-2.5 rounded-xl bg-stitch-surface-container/40 shrink-0">
        {getFileIcon(document.content_type)}
      </div>

      <div className="flex-1 min-w-0 pr-12">
        <h3 className="text-xs font-bold text-stitch-on-surface truncate group-hover:text-stitch-primary transition-colors" title={document.file_name}>
          {document.file_name}
        </h3>
        <p className="text-[10px] text-stitch-on-surface-variant/80 mt-1 select-none flex items-center gap-2">
          <span>{formatBytes(document.file_size)}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-300" />
          <span>{new Date(document.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </p>
        {document.processing_status && (
          <div className="flex items-center gap-2 mt-1.5 select-none text-[9px] font-semibold">
            <span className={`px-2 py-0.5 rounded-full ${
              document.processing_status === 'Processed'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/15'
                : document.processing_status === 'Processing...'
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/15 animate-pulse'
                : 'bg-zinc-500/10 text-zinc-600 border border-zinc-500/15'
            }`}>
              {document.processing_status}
            </span>
            {document.processing_status === 'Processed' && document.chunk_count !== undefined && (
              <span className="text-stitch-on-surface-variant/75 font-medium">
                {document.chunk_count} chunks (avg {document.avg_chunk_size} chars)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {onChunk && isSupportedFormat(document.content_type, document.file_name) && (
          <button
            onClick={handleChunk}
            disabled={isChunking || document.processing_status === 'Processing...'}
            className={`p-1.5 hover:bg-stitch-surface-container rounded-lg text-stitch-on-surface-variant hover:text-stitch-primary transition-colors ${
              isChunking || document.processing_status === 'Processing...' ? 'animate-pulse text-stitch-primary' : ''
            }`}
            title="Semantic Chunking"
            id={`btn-chunk-${document.id}`}
          >
            <Cpu className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(document); }}
          className="p-1.5 hover:bg-stitch-surface-container rounded-lg text-stitch-on-surface-variant hover:text-stitch-primary transition-colors"
          title="Preview File"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={handleDownload}
          className="p-1.5 hover:bg-stitch-surface-container rounded-lg text-stitch-on-surface-variant hover:text-stitch-primary transition-colors"
          title="Download File"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 hover:bg-stitch-surface-container rounded-lg text-stitch-on-surface-variant hover:text-stitch-error transition-colors"
          title="Delete File"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};
