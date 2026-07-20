import React, { useCallback, useState } from 'react';

interface AttachmentUploaderProps {
  onUpload: (file: File, onProgress: (p: number) => void) => Promise<void>;
  multiple?: boolean;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({ onUpload, multiple = true }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<Array<{ id: string; file: File; progress: number; error?: string }>>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      await processFiles(multiple ? files : [files[0]]);
    }
  }, [multiple]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      await processFiles(multiple ? files : [files[0]]);
    }
  };

  const uploadSingleFile = async (id: string, file: File) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 0, error: undefined } : u));
    try {
      await onUpload(file, (progress) => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress } : u));
      });
      // Remove on success
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.id !== id));
      }, 1000);
    } catch (error) {
      setUploads(prev => prev.map(u => u.id === id ? { ...u, error: 'Upload failed' } : u));
    }
  };

  const processFiles = async (files: File[]) => {
    const newUploads = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0
    }));
    
    setUploads(prev => [...prev, ...newUploads]);

    newUploads.forEach(upload => {
      uploadSingleFile(upload.id, upload.file);
    });
  };

  return (
    <div className="w-full">
      <div 
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
          isDragging ? 'border-stitch-primary bg-stitch-primary/5' : 'border-stitch-outline-variant bg-stitch-surface-container-low hover:bg-stitch-surface-container'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          multiple={multiple} 
          onChange={handleChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 text-stitch-primary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm font-bold text-stitch-on-surface">Click or drag files to upload</p>
          <p className="text-xs text-stitch-on-surface-variant mt-1">Supports images, documents, and other files</p>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="mt-4 space-y-2 animate-fade-in">
          {uploads.map(upload => (
            <div key={upload.id} className="flex items-center gap-3 p-3 bg-white border border-stitch-outline-variant rounded-lg shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-medium text-stitch-on-surface truncate">{upload.file.name}</span>
                  {upload.error ? (
                    <span className="text-red-500 font-medium">{upload.error}</span>
                  ) : (
                    <span className="text-stitch-on-surface-variant">{upload.progress}%</span>
                  )}
                </div>
                <div className="w-full h-1.5 bg-stitch-surface-container-highest rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${upload.error ? 'bg-red-500' : upload.progress === 100 ? 'bg-green-500' : 'bg-stitch-primary'}`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {upload.error && (
                  <button
                    onClick={() => uploadSingleFile(upload.id, upload.file)}
                    className="p-1 text-stitch-primary hover:bg-stitch-primary/10 rounded-full transition-colors"
                    title="Retry Upload"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setUploads(prev => prev.filter(u => u.id !== upload.id))}
                  className="p-1 text-stitch-on-surface-variant hover:text-stitch-error hover:bg-stitch-surface-container rounded-full transition-colors"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

