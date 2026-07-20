import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAttachments } from '../hooks/useAttachments';
import { AttachmentUploader } from './AttachmentUploader';
import { AttachmentGrid } from './AttachmentGrid';
import { AttachmentPreview } from './AttachmentPreview';
import { Attachment } from '../types';
import { ProjectLayout } from '../../projects/components/ProjectLayout';
import { Search, ChevronDown } from 'lucide-react';

export const ProjectFilesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const { attachments, isLoading, error, uploadFile, deleteFile } = useAttachments(projectId || '');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  if (!projectId) return <div>Project ID is required</div>;

  const handleUpload = async (file: File, onProgress: (p: number) => void) => {
    await uploadFile({ projectId, file, onProgress });
  };

  const filteredAndSortedAttachments = useMemo(() => {
    if (!attachments) return [];

    let result = [...attachments];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.file_name.toLowerCase().includes(q));
    }

    // 2. File Type Filter
    if (fileTypeFilter !== 'all') {
      if (fileTypeFilter === 'image') {
        result = result.filter(a => a.content_type.startsWith('image/'));
      } else if (fileTypeFilter === 'pdf') {
        result = result.filter(a => a.content_type === 'application/pdf');
      } else if (fileTypeFilter === 'document') {
        result = result.filter(a => 
          !a.content_type.startsWith('image/') && a.content_type !== 'application/pdf'
        );
      }
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'name-asc') {
        return a.file_name.localeCompare(b.file_name);
      }
      if (sortBy === 'name-desc') {
        return b.file_name.localeCompare(a.file_name);
      }
      if (sortBy === 'size-desc') {
        return b.file_size - a.file_size;
      }
      if (sortBy === 'size-asc') {
        return a.file_size - b.file_size;
      }
      return 0;
    });

    return result;
  }, [attachments, searchQuery, fileTypeFilter, sortBy]);

  return (
    <ProjectLayout>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stitch-on-surface">Project Files</h1>
            <p className="text-sm text-stitch-on-surface-variant mt-1">Manage and collaborate on files for this project</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stitch-outline-variant shadow-sm shrink-0">
          <h2 className="text-sm font-semibold text-stitch-on-surface mb-4">Upload Files</h2>
          <AttachmentUploader onUpload={handleUpload} multiple={true} />
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white p-6 rounded-2xl border border-stitch-outline-variant shadow-sm">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-sm font-semibold text-stitch-on-surface">All Files ({filteredAndSortedAttachments.length})</h2>
          </div>

          {/* Search and Filters controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-stitch-surface-container/20 p-4 border border-stitch-outline-variant/50 rounded-2xl mb-6">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-stitch-on-surface-variant/60">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search files by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-9 pr-4 py-2 text-xs text-stitch-on-surface placeholder-stitch-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all duration-200"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* File Type Filter */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="w-full sm:w-auto bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary select-none appearance-none font-medium"
                >
                  <option value="all">All File Types</option>
                  <option value="image">Images</option>
                  <option value="pdf">PDFs</option>
                  <option value="document">Documents</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>

              {/* Sorting Dropdown */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:w-auto bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary select-none appearance-none font-medium"
                >
                  <option value="newest">Newest Uploaded</option>
                  <option value="oldest">Oldest Uploaded</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="size-desc">Size (Largest)</option>
                  <option value="size-asc">Size (Smallest)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[300px] pr-2 -mr-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-stitch-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                Failed to load attachments. Please try again.
              </div>
            ) : (
              <AttachmentGrid 
                attachments={filteredAndSortedAttachments} 
                onDelete={async (id) => { await deleteFile(id); }}
                onPreview={setPreviewAttachment}
              />
            )}
          </div>
        </div>

        {previewAttachment && (
          <AttachmentPreview 
            attachment={previewAttachment} 
            onClose={() => setPreviewAttachment(null)} 
          />
        )}
      </div>
    </ProjectLayout>
  );
};

