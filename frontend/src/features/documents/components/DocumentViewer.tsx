import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentAnalysis, DocumentRequirements, DocumentEpic, ProjectGenerationSummary } from '../types';
import { X, Download, FileText, AlertCircle, Cpu, Loader2, Sparkles, AlertTriangle, CheckCircle, Calendar, Settings, Shield, HelpCircle, Link, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { documentService } from '../services/documentService';



interface DocumentViewerProps {
  document: Document | null;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose }) => {
  const navigate = useNavigate();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  // Project Generation states
  const [generatingProject, setGeneratingProject] = useState(false);
  const [generationSummary, setGenerationSummary] = useState<ProjectGenerationSummary | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerateProject = async () => {
    if (!document) return;
    setGeneratingProject(true);
    setGenerationError(null);
    try {
      const summary = await documentService.generateProjectFromDocument(document.id);
      setGenerationSummary(summary);
      setTimeout(() => {
        navigate(`/projects/${summary.project_id}`);
        onClose();
      }, 4000);
    } catch (err: any) {
      setGenerationError(err.response?.data?.detail || err.message || 'Failed to generate project');
    } finally {
      setGeneratingProject(false);
    }
  };

  // AI Analysis states
  const [activeTab, setActiveTab] = useState<'preview' | 'analysis' | 'requirements' | 'stories'>('preview');
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);

  // AI Stories states
  const [stories, setStories] = useState<DocumentEpic[] | null>(null);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});

  const fetchStories = async (docId: string) => {
    try {
      const data = await documentService.getDocumentStories(docId);
      setStories((current) => {
        if (current && current.length > 0 && current[0].document_id === docId) {
          return current;
        }
        if (data.length > 0) {
          setExpandedEpics(prev => ({ ...prev, [data[0].id]: true }));
        }
        return data;
      });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setStories((current) => {
          if (current && current.length > 0 && current[0].document_id === docId) {
            return current;
          }
          return null;
        });
      } else {
        setStoriesError(err.message || 'Failed to retrieve stories');
      }
    }
  };

  const handleStartStories = async () => {
    if (!document) return;
    setStoriesLoading(true);
    setStoriesError(null);
    try {
      const data = await documentService.generateDocumentStories(document.id);
      setStories(data);
      if (data.length > 0) {
        setExpandedEpics(prev => ({ ...prev, [data[0].id]: true }));
      }
    } catch (err: any) {
      setStoriesError(err.message || 'Failed to generate user stories');
    } finally {
      setStoriesLoading(false);
    }
  };

  // AI Requirements states
  const [requirements, setRequirements] = useState<DocumentRequirements | null>(null);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    functional_requirements: true,
    non_functional_requirements: true,
    business_rules: false,
    assumptions: false,
    dependencies: false,
    risks: false
  });

  const fetchRequirements = async (docId: string) => {
    try {
      const data = await documentService.getDocumentRequirements(docId);
      setRequirements((current) => {
        if (current && current.document_id === docId) {
          return current;
        }
        return data;
      });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setRequirements((current) => {
          if (current && current.document_id === docId) {
            return current;
          }
          return null;
        });
      } else {
        setRequirementsError(err.message || 'Failed to retrieve requirements');
      }
    }
  };

  const handleStartRequirements = async () => {
    if (!document) return;
    setRequirementsLoading(true);
    setRequirementsError(null);
    try {
      const data = await documentService.extractDocumentRequirements(document.id);
      setRequirements(data);
    } catch (err: any) {
      setRequirementsError(err.message || 'Failed to extract requirements');
    } finally {
      setRequirementsLoading(false);
    }
  };

  const startPolling = (docId: string) => {
    stopPolling();
    const interval = setInterval(async () => {
      try {
        const data = await documentService.getDocumentAnalysis(docId);
        setAnalysis(data);
        if (data.status === 'Completed' || data.status === 'Failed') {
          stopPolling();
        }
      } catch (err) {
        stopPolling();
      }
    }, 2000);
    pollingRef.current = interval as any;
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const fetchAnalysis = async (docId: string) => {
    try {
      const data = await documentService.getDocumentAnalysis(docId);
      setAnalysis(data);
      if (data.status === 'Pending' || data.status === 'Analyzing') {
        startPolling(docId);
      } else {
        stopPolling();
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setAnalysis(null);
      } else {
        setAnalysisError(err.message || 'Failed to retrieve analysis');
      }
    }
  };

  const handleStartAnalysis = async () => {
    if (!document) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const data = await documentService.analyzeDocument(document.id);
      setAnalysis(data);
      startPolling(document.id);
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to start document analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

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

  useEffect(() => {
    stopPolling();
    setAnalysis(null);
    setAnalysisError(null);
    setRequirements(null);
    setRequirementsError(null);
    setRequirementsLoading(false);
    setStories(null);
    setStoriesError(null);
    setStoriesLoading(false);
    setExpandedEpics({});
    setGeneratingProject(false);
    setGenerationSummary(null);
    setGenerationError(null);
    setActiveTab('preview');
    if (document) {
      fetchAnalysis(document.id);
      fetchRequirements(document.id);
      fetchStories(document.id);
    }
    return () => stopPolling();
  }, [document]);

  if (!document) return null;

  const isImage = document.content_type.toLowerCase().startsWith('image/');
  const isPdf = document.content_type.toLowerCase() === 'application/pdf';
  const isText = textContent !== null;

  const renderAnalysis = () => {
    if (analysisLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stitch-on-surface-variant gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-stitch-primary" />
          <span className="text-xs font-semibold">Communicating with AI services...</span>
        </div>
      );
    }

    if (analysisError) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stitch-error gap-3 p-8 max-w-md mx-auto text-center">
          <AlertCircle className="w-10 h-10" />
          <h3 className="text-sm font-bold text-stitch-on-surface">Analysis Failed</h3>
          <p className="text-xs text-stitch-on-surface-variant">{analysisError}</p>
          <Button variant="primary" size="md" className="rounded-xl mt-2" onClick={handleStartAnalysis}>
            Retry Analysis
          </Button>
        </div>
      );
    }

    if (!analysis) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
          <div className="p-4 bg-stitch-primary/10 rounded-full mb-4 text-stitch-primary">
            <Cpu className="w-12 h-12" />
          </div>
          <h3 className="text-sm font-bold text-stitch-on-surface">AI Document Analysis</h3>
          <p className="text-xs text-stitch-on-surface-variant/80 mt-1.5 mb-6 leading-relaxed">
            Generate an automated executive summary, objectives, timeline, deliverables, and risk evaluation for this document using the Gemini model.
          </p>
          <Button
            variant="primary"
            size="md"
            className="rounded-xl font-bold flex items-center gap-2"
            onClick={handleStartAnalysis}
            id="btn-trigger-analysis"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start AI Analysis</span>
          </Button>
        </div>
      );
    }

    if (analysis.status === 'Pending' || analysis.status === 'Analyzing') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stitch-on-surface-variant gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-stitch-primary" />
          <div className="text-center">
            <h3 className="text-sm font-bold text-stitch-on-surface">Analyzing Document...</h3>
            <p className="text-xs text-stitch-on-surface-variant mt-1.5 max-w-xs leading-relaxed">
              Gemini is reviewing the document chunks to extract structured intelligence. This may take a few moments.
            </p>
          </div>
        </div>
      );
    }

    if (analysis.status === 'Failed') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stitch-error gap-3 p-8 max-w-md mx-auto text-center">
          <AlertCircle className="w-10 h-10" />
          <h3 className="text-sm font-bold text-stitch-on-surface">Analysis Generation Failed</h3>
          <p className="text-xs text-stitch-on-surface-variant">{analysis.error_message || 'An unknown error occurred during analysis.'}</p>
          <Button variant="primary" size="md" className="rounded-xl mt-2" onClick={handleStartAnalysis}>
            Try Again
          </Button>
        </div>
      );
    }

    return (
      <div className="w-full text-left space-y-6">
        {/* Executive Summary */}
        <div className="bg-white border border-stitch-outline-variant/60 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-stitch-primary flex items-center gap-1.5 uppercase tracking-wider select-none mb-3">
            <Sparkles className="w-4 h-4" />
            Executive Summary
          </h3>
          <p className="text-xs text-stitch-on-surface leading-relaxed select-text" id="analysis-summary">
            {analysis.executive_summary}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Objectives */}
          <div className="bg-white border border-stitch-outline-variant/60 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-stitch-on-surface flex items-center gap-1.5 uppercase tracking-wider select-none mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Core Objectives
            </h3>
            <ul className="space-y-2 select-text">
              {analysis.objectives?.map((item, idx) => (
                <li key={idx} className="text-xs text-stitch-on-surface-variant flex items-start gap-2 leading-relaxed">
                  <span className="text-emerald-500 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Deliverables */}
          <div className="bg-white border border-stitch-outline-variant/60 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-stitch-on-surface flex items-center gap-1.5 uppercase tracking-wider select-none mb-3">
              <FileText className="w-4 h-4 text-indigo-500" />
              Key Deliverables
            </h3>
            <ul className="space-y-2 select-text">
              {analysis.deliverables?.map((item, idx) => (
                <li key={idx} className="text-xs text-stitch-on-surface-variant flex items-start gap-2 leading-relaxed">
                  <span className="text-indigo-500 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-stitch-outline-variant/60 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-stitch-on-surface flex items-center gap-1.5 uppercase tracking-wider select-none mb-3">
              <Calendar className="w-4 h-4 text-amber-500" />
              Timeline & Milestones
            </h3>
            <ul className="space-y-2 select-text">
              {analysis.timeline?.map((item, idx) => (
                <li key={idx} className="text-xs text-stitch-on-surface-variant flex items-start gap-2 leading-relaxed">
                  <span className="text-amber-500 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div className="bg-white border border-stitch-outline-variant/60 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-stitch-on-surface flex items-center gap-1.5 uppercase tracking-wider select-none mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Identified Risks
            </h3>
            <ul className="space-y-2 select-text">
              {analysis.risks?.map((item, idx) => (
                <li key={idx} className="text-xs text-stitch-on-surface-variant flex items-start gap-2 leading-relaxed">
                  <span className="text-red-500 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderRequirements = () => {
    if (requirementsLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stitch-on-surface-variant gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-stitch-primary" />
          <span className="text-xs font-semibold">Extracting requirements with AI...</span>
        </div>
      );
    }

    if (requirementsError) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stitch-error gap-3 p-8 max-w-md mx-auto text-center">
          <AlertCircle className="w-10 h-10" />
          <h3 className="text-sm font-bold text-stitch-on-surface">Extraction Failed</h3>
          <p className="text-xs text-stitch-on-surface-variant">{requirementsError}</p>
          <Button variant="primary" size="md" className="rounded-xl mt-2" onClick={handleStartRequirements}>
            Retry Extraction
          </Button>
        </div>
      );
    }

    if (!requirements) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
          <div className="p-4 bg-stitch-primary/10 rounded-full mb-4 text-stitch-primary">
            <Cpu className="w-12 h-12" />
          </div>
          <h3 className="text-sm font-bold text-stitch-on-surface">AI Requirements Extraction</h3>
          <p className="text-xs text-stitch-on-surface-variant/80 mt-1.5 mb-6 leading-relaxed">
            Extract software requirements, business rules, assumptions, dependencies, and risks from the document content using the Gemini model.
          </p>
          <Button
            variant="primary"
            size="md"
            className="rounded-xl font-bold flex items-center gap-2"
            onClick={handleStartRequirements}
            id="btn-trigger-requirements"
          >
            <Sparkles className="w-4 h-4" />
            <span>Extract Requirements</span>
          </Button>
        </div>
      );
    }

    const sections = [
      {
        key: 'functional_requirements',
        title: 'Functional Requirements',
        color: 'text-emerald-500',
        icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
        items: requirements.functional_requirements
      },
      {
        key: 'non_functional_requirements',
        title: 'Non-Functional Requirements',
        color: 'text-indigo-500',
        icon: <Settings className="w-4 h-4 text-indigo-500" />,
        items: requirements.non_functional_requirements
      },
      {
        key: 'business_rules',
        title: 'Business Rules',
        color: 'text-blue-500',
        icon: <Shield className="w-4 h-4 text-blue-500" />,
        items: requirements.business_rules
      },
      {
        key: 'assumptions',
        title: 'Assumptions',
        color: 'text-amber-500',
        icon: <HelpCircle className="w-4 h-4 text-amber-500" />,
        items: requirements.assumptions
      },
      {
        key: 'dependencies',
        title: 'Dependencies',
        color: 'text-purple-500',
        icon: <Link className="w-4 h-4 text-purple-500" />,
        items: requirements.dependencies
      },
      {
        key: 'risks',
        title: 'Risks',
        color: 'text-red-500',
        icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
        items: requirements.risks
      }
    ];

    return (
      <div className="w-full text-left space-y-4">
        {sections.map((sec) => {
          const isExpanded = !!expandedSections[sec.key];
          return (
            <div 
              key={sec.key} 
              className="border border-stitch-outline-variant/60 rounded-2xl overflow-hidden shadow-sm transition-all bg-white"
              id={`section-${sec.key}`}
            >
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-stitch-surface-container/10 transition-colors text-left"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  {sec.icon}
                  <span className="text-xs font-bold text-stitch-on-surface uppercase tracking-wider">
                    {sec.title}
                  </span>
                  <span className="text-[10px] bg-stitch-surface-container-high text-stitch-on-surface-variant font-bold px-2 py-0.5 rounded-full">
                    {sec.items?.length || 0}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-stitch-on-surface-variant" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stitch-on-surface-variant" />
                )}
              </button>
              {isExpanded && (
                <div className="px-6 pb-5 pt-1 border-t border-stitch-outline-variant/30 select-text">
                  {sec.items && sec.items.length > 0 ? (
                    <ul className="space-y-2.5">
                      {sec.items.map((item, idx) => (
                        <li key={idx} className="text-xs text-stitch-on-surface-variant flex items-start gap-2.5 leading-relaxed">
                          <span className={`${sec.color} font-bold shrink-0 mt-0.5`}>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-stitch-on-surface-variant/60 italic py-2">
                      No requirements detected in this category.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStories = () => {
    if (storiesLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stitch-on-surface-variant gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-stitch-primary" />
          <span className="text-xs font-semibold">Generating epics and stories with AI...</span>
        </div>
      );
    }

    if (storiesError) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stitch-error gap-3 p-8 max-w-md mx-auto text-center">
          <AlertCircle className="w-10 h-10" />
          <h3 className="text-sm font-bold text-stitch-on-surface">Generation Failed</h3>
          <p className="text-xs text-stitch-on-surface-variant">{storiesError}</p>
          <Button variant="primary" size="md" className="rounded-xl mt-2" onClick={handleStartStories}>
            Retry Generation
          </Button>
        </div>
      );
    }

    if (!stories) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
          <div className="p-4 bg-stitch-primary/10 rounded-full mb-4 text-stitch-primary">
            <Sparkles className="w-12 h-12" />
          </div>
          <h3 className="text-sm font-bold text-stitch-on-surface">AI Epic & User Story Generation</h3>
          <p className="text-xs text-stitch-on-surface-variant/80 mt-1.5 mb-6 leading-relaxed">
            Translate your document requirements into high-quality agile artifacts including Epics, User Stories, Acceptance Criteria, Priorities, and Story Point estimates.
          </p>
          <Button
            variant="primary"
            size="md"
            className="rounded-xl font-bold flex items-center gap-2"
            onClick={handleStartStories}
            id="btn-trigger-stories"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Epics & Stories</span>
          </Button>
        </div>
      );
    }

    return (
      <div className="w-full text-left space-y-5">
        {stories.map((epic) => {
          const isExpanded = !!expandedEpics[epic.id];
          return (
            <div 
              key={epic.id} 
              className="border border-stitch-outline-variant/60 rounded-2xl overflow-hidden shadow-sm bg-white"
              id={`epic-${epic.id}`}
            >
              {/* Epic Header */}
              <button
                onClick={() => setExpandedEpics(prev => ({ ...prev, [epic.id]: !prev[epic.id] }))}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-stitch-surface-container/10 transition-colors text-left border-b border-stitch-outline-variant/30"
                aria-expanded={isExpanded}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stitch-primary uppercase tracking-wider">
                      Epic
                    </span>
                    <span className="text-[10px] bg-stitch-primary/10 text-stitch-primary font-bold px-2 py-0.5 rounded-full">
                      {epic.stories?.length || 0} Stories
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-stitch-on-surface mt-1 truncate">
                    {epic.title}
                  </h4>
                  {epic.description && (
                    <p className="text-xs text-stitch-on-surface-variant mt-1 font-normal line-clamp-1 select-text">
                      {epic.description}
                    </p>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-stitch-on-surface-variant shrink-0 ml-4" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stitch-on-surface-variant shrink-0 ml-4" />
                )}
              </button>

              {/* Epic Body (Nested Stories) */}
              {isExpanded && (
                <div className="p-6 bg-stitch-background/10 space-y-6">
                  {epic.stories && epic.stories.length > 0 ? (
                    <div className="space-y-4">
                      {epic.stories.map((story) => (
                        <div 
                          key={story.id} 
                          className="bg-white border border-stitch-outline-variant/40 rounded-xl p-5 shadow-sm space-y-3 select-text"
                          id={`story-${story.id}`}
                        >
                          {/* Story Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stitch-outline-variant/20 pb-2">
                            <h5 className="text-xs font-bold text-stitch-on-surface">
                              {story.title}
                            </h5>
                            <div className="flex items-center gap-2">
                              {/* Priority Badge */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                story.priority === 'High' 
                                  ? 'bg-red-50 text-red-600 border border-red-100'
                                  : story.priority === 'Medium'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                                {story.priority} Priority
                              </span>
                              {/* Story Points */}
                              <span className="text-[10px] bg-stitch-surface-container-high text-stitch-on-surface-variant font-bold px-2 py-0.5 rounded-full">
                                {story.story_points} SP
                              </span>
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <span className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider block mb-1 select-none">
                              Description
                            </span>
                            <p className="text-xs text-stitch-on-surface leading-relaxed">
                              {story.description}
                            </p>
                          </div>

                          {/* Acceptance Criteria */}
                          {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider block mb-1 select-none">
                                Acceptance Criteria
                              </span>
                              <ul className="space-y-1">
                                {story.acceptance_criteria.map((criteria, cIdx) => (
                                  <li key={cIdx} className="text-xs text-stitch-on-surface-variant flex items-start gap-2 leading-relaxed">
                                    <span className="text-stitch-primary font-bold shrink-0">•</span>
                                    <span>{criteria}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stitch-on-surface-variant/60 italic py-2">
                      No nested user stories generated for this epic.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm select-none" onClick={onClose}>
      <div 
        className="relative w-full max-w-5xl h-[85vh] bg-white border border-stitch-outline-variant rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Project Generation Loading Overlay */}
        {generatingProject && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center text-center p-8 select-none">
            <Loader2 className="w-12 h-12 animate-spin text-stitch-primary mb-4" />
            <h3 className="text-base font-bold text-stitch-on-surface">Generating SprintMind Project</h3>
            <p className="text-xs text-stitch-on-surface-variant max-w-sm mt-2 leading-relaxed">
              Translating AI requirements, epics, and user stories into a fully configured agile project workspace...
            </p>
          </div>
        )}

        {/* Project Generation Success Overlay */}
        {generationSummary && (
          <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4 border border-emerald-100 animate-bounce">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-stitch-on-surface">Project Generated Successfully!</h3>
            <p className="text-xs text-stitch-on-surface-variant max-w-sm mt-1 mb-6">
              Your document analysis has been mapped to active SprintMind entities:
            </p>
            
            {/* Stats Table */}
            <div className="grid grid-cols-3 gap-6 max-w-md w-full bg-stitch-surface-container/20 p-6 rounded-2xl border border-stitch-outline-variant/40 mb-6">
              <div className="text-center">
                <span className="text-2xl font-bold text-stitch-primary">1</span>
                <span className="text-[10px] font-semibold text-stitch-on-surface-variant uppercase tracking-wider block mt-1">Project</span>
              </div>
              <div className="text-center border-x border-stitch-outline-variant/40 px-4">
                <span className="text-2xl font-bold text-stitch-primary" id="summary-epics-count">{generationSummary.epics_count}</span>
                <span className="text-[10px] font-semibold text-stitch-on-surface-variant uppercase tracking-wider block mt-1">Epics</span>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-stitch-primary" id="summary-tasks-count">{generationSummary.tasks_count}</span>
                <span className="text-[10px] font-semibold text-stitch-on-surface-variant uppercase tracking-wider block mt-1">Tasks</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-stitch-primary animate-pulse text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to your new project board...</span>
            </div>
          </div>
        )}

        {/* Project Generation Error Overlay */}
        {generationError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-100 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 max-w-md z-50">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1 text-left">{generationError}</span>
            <button 
              onClick={() => setGenerationError(null)} 
              className="p-0.5 hover:bg-red-100 rounded-lg text-red-500 shrink-0"
              id="btn-close-gen-error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
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
            {document && (
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl font-bold flex items-center gap-1.5"
                onClick={handleGenerateProject}
                disabled={generatingProject || !!generationSummary}
                id="btn-generate-project"
              >
                {generatingProject ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
                <span>Generate Project</span>
              </Button>
            )}
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

        {/* Tab Switcher */}
        <div className="px-6 border-b border-stitch-outline-variant/60 flex items-center gap-4 shrink-0 bg-stitch-surface-container/10">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 text-xs font-bold border-b-2 transition-all select-none ${
              activeTab === 'preview'
                ? 'border-stitch-primary text-stitch-primary'
                : 'border-transparent text-stitch-on-surface-variant hover:text-stitch-on-surface'
            }`}
            id="tab-preview"
          >
            File Preview
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-3 text-xs font-bold border-b-2 transition-all select-none flex items-center gap-1.5 ${
              activeTab === 'analysis'
                ? 'border-stitch-primary text-stitch-primary'
                : 'border-transparent text-stitch-on-surface-variant hover:text-stitch-on-surface'
            }`}
            id="tab-analysis"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Document Analysis
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={`py-3 text-xs font-bold border-b-2 transition-all select-none flex items-center gap-1.5 ${
              activeTab === 'requirements'
                ? 'border-stitch-primary text-stitch-primary'
                : 'border-transparent text-stitch-on-surface-variant hover:text-stitch-on-surface'
            }`}
            id="tab-requirements"
          >
            <FileText className="w-3.5 h-3.5" />
            AI Requirements
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`py-3 text-xs font-bold border-b-2 transition-all select-none flex items-center gap-1.5 ${
              activeTab === 'stories'
                ? 'border-stitch-primary text-stitch-primary'
                : 'border-transparent text-stitch-on-surface-variant hover:text-stitch-on-surface'
            }`}
            id="tab-stories"
          >
            <Cpu className="w-3.5 h-3.5" />
            AI User Stories
          </button>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto bg-stitch-background p-6">
          {activeTab === 'preview' ? (
            <div className="w-full h-full flex items-center justify-center">
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
          ) : activeTab === 'analysis' ? (
            renderAnalysis()
          ) : activeTab === 'requirements' ? (
            renderRequirements()
          ) : (
            renderStories()
          )}
        </div>
      </div>
    </div>
  );
};
