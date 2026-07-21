import React, { useState, useMemo, useEffect } from 'react';
import { useProjects } from '../../projects/hooks/useProjects';
import { useDocuments } from '../hooks/useDocuments';
import { ProjectLayout } from '../../projects/components/ProjectLayout';
import { DocumentUploader } from '../components/DocumentUploader';
import { DocumentGrid } from '../components/DocumentGrid';
import { DocumentViewer } from '../components/DocumentViewer';
import { Document } from '../types';
import { Search, ChevronDown, FolderOpen } from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const { projects, loading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Automatically select the first project when projects are loaded
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const { 
    documents, 
    isLoading: documentsLoading, 
    error, 
    uploadFile, 
    deleteFile,
    chunkDocument
  } = useDocuments(selectedProjectId);

  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const handleUpload = async (file: File, onProgress: (p: number) => void) => {
    if (!selectedProjectId) return;
    await uploadFile({ projectId: selectedProjectId, file, onProgress });
  };

  const filteredAndSortedDocuments = useMemo(() => {
    if (!documents) return [];

    let result = [...documents];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.file_name.toLowerCase().includes(q));
    }

    // 2. File Type Filter
    if (fileTypeFilter !== 'all') {
      if (fileTypeFilter === 'image') {
        result = result.filter(d => d.content_type.startsWith('image/'));
      } else if (fileTypeFilter === 'pdf') {
        result = result.filter(d => d.content_type === 'application/pdf');
      } else if (fileTypeFilter === 'document') {
        result = result.filter(d => 
          d.content_type === 'application/pdf' || 
          d.content_type.includes('word') || 
          d.content_type.includes('officedocument') ||
          d.content_type.includes('text/plain')
        );
      } else if (fileTypeFilter === 'spreadsheet') {
        result = result.filter(d => 
          d.content_type.includes('spreadsheet') || 
          d.content_type.includes('excel') || 
          d.content_type.includes('csv') || 
          d.content_type.includes('sheet')
        );
      } else if (fileTypeFilter === 'code') {
        result = result.filter(d => 
          d.content_type.includes('json') || 
          d.content_type.includes('javascript') || 
          d.content_type.includes('typescript') || 
          d.content_type.includes('html') || 
          d.content_type.includes('css')
        );
      } else if (fileTypeFilter === 'archive') {
        result = result.filter(d => 
          d.content_type.includes('zip') || 
          d.content_type.includes('tar') || 
          d.content_type.includes('rar') || 
          d.content_type.includes('7z')
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
  }, [documents, searchQuery, fileTypeFilter, sortBy]);

  const activeProjectName = useMemo(() => {
    const proj = projects.find(p => p.id === selectedProjectId);
    return proj ? proj.name : '';
  }, [projects, selectedProjectId]);

  return (
    <ProjectLayout>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto px-4 md:px-6 py-6 text-stitch-on-surface select-none">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stitch-outline-variant/50 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-xs text-stitch-on-surface-variant mt-1.5 leading-relaxed">
            Upload, preview, download, and manage your project documentation.
          </p>
        </div>

        {/* Project Selector dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-stitch-on-surface-variant">Active Project:</span>
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={projectsLoading}
              className="bg-white border border-stitch-outline-variant rounded-xl pl-3.5 pr-9 py-2 text-xs font-bold focus:outline-none appearance-none disabled:opacity-50 min-w-[200px]"
            >
              {projectsLoading ? (
                <option>Loading projects...</option>
              ) : projects.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))
              )}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Upload Container */}
      {selectedProjectId ? (
        <div className="bg-white p-6 rounded-2xl border border-stitch-outline-variant/60 shadow-sm shrink-0">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-stitch-on-surface-variant/80 mb-4">
            Upload New Documents ({activeProjectName})
          </h2>
          <DocumentUploader onUpload={handleUpload} multiple={true} />
        </div>
      ) : !projectsLoading && projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-stitch-outline-variant/60 rounded-2xl shadow-sm">
          <FolderOpen className="w-12 h-12 text-stitch-on-surface-variant/40 mb-3" />
          <h3 className="text-sm font-bold text-stitch-on-surface">No Projects Found</h3>
          <p className="text-xs text-stitch-on-surface-variant mt-1.5 max-w-sm">
            Please create a project first before uploading documents.
          </p>
        </div>
      ) : null}

      {/* Search, Filter & Grid Layout */}
      {selectedProjectId && (
        <div className="flex flex-col min-h-0 bg-white p-6 rounded-2xl border border-stitch-outline-variant/60 shadow-sm">
          
          {/* Search and Filters panel */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-stitch-surface-container/20 p-4 border border-stitch-outline-variant/50 rounded-2xl mb-6">
            
            {/* Search Bar */}
            <div className="relative w-full md:flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-stitch-on-surface-variant/60">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search documents by filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-9 pr-4 py-2 text-xs text-stitch-on-surface focus:outline-none focus:ring-2 focus:ring-stitch-primary/20 focus:border-stitch-primary transition-all duration-200"
              />
            </div>

            {/* Type Filter & Sorter controls */}
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
              <div className="relative">
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface font-semibold focus:outline-none appearance-none"
                >
                  <option value="all">All File Types</option>
                  <option value="pdf">PDF Files</option>
                  <option value="image">Image Files</option>
                  <option value="document">Text & Word Docs</option>
                  <option value="spreadsheet">Spreadsheets</option>
                  <option value="code">Code & JSON</option>
                  <option value="archive">Archives</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-white border border-stitch-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs text-stitch-on-surface font-semibold focus:outline-none appearance-none"
                >
                  <option value="newest">Newest Uploaded</option>
                  <option value="oldest">Oldest Uploaded</option>
                  <option value="name-asc">Filename A-Z</option>
                  <option value="name-desc">Filename Z-A</option>
                  <option value="size-desc">Size: Largest</option>
                  <option value="size-asc">Size: Smallest</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none" />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-[11px] font-semibold text-stitch-error bg-stitch-error/5 border border-stitch-error/10 rounded-xl px-3 py-2.5 mb-4 select-none">
              {error}
            </p>
          )}

          {/* Document Cards List */}
          <DocumentGrid 
            documents={filteredAndSortedDocuments}
            isLoading={documentsLoading}
            onPreview={setPreviewDocument}
            onDelete={deleteFile}
            onChunk={chunkDocument}
            searchQuery={searchQuery}
          />
        </div>
      )}

      {/* Preview modal backdrop */}
      <DocumentViewer 
        document={previewDocument} 
        onClose={() => setPreviewDocument(null)} 
      />
      </div>
    </ProjectLayout>
  );
};
