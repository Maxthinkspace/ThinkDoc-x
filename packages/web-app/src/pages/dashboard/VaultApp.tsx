import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Database,
  Search,
  Upload,
  FolderOpen,
  Users,
  FileText,
  Folder,
  ChevronRight,
  ArrowLeft,
  Filter,
  MoreHorizontal,
  Plus,
  Info,
  Check,
  X,
  BarChart3,
  Loader2,
  Trash2,
  Share2,
  Download,
  Settings2,
  Pencil,
  MessageSquare,
  Copy,
  FileSpreadsheet,
  GripVertical,
  CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import FileSourceDialog from "@/components/vault/FileSourceDialog";
import QueryTypeDialog from "@/components/vault/QueryTypeDialog";
import ColumnBuilderDialog, { ColumnConfig } from "@/components/vault/ColumnBuilderDialog";
import CitationCell, { CellData } from "@/components/vault/CitationCell";
import CreateProjectDialog from "@/components/vault/CreateProjectDialog";
import VerificationModal from "@/components/vault/VerificationModal";
import AssignmentDropdown from "@/components/vault/AssignmentDropdown";
import AskTablePanel from "@/components/vault/AskTablePanel";
import PdfViewer from "@/components/agent/PdfViewer";
import DocumentViewer from "@/components/agent/DocumentViewer";
import { Textarea } from "@/components/ui/textarea";
import * as XLSX from "xlsx";
import { PlaybooksView } from "@/pages/dashboard/library/PlaybooksView";
import { ClausesView } from "@/pages/dashboard/library/ClausesView";
import { PromptsView } from "@/pages/dashboard/library/PromptsView";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Import API client instead of Supabase
import {
  vaultApi,
  VaultProject,
  VaultFile,
  VaultQuery,
  JobStatus,
  MAX_VAULT_FILES,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
} from "@/services/vaultApi";

// ============================================
// TYPES
// ============================================

interface AnalysisColumn {
  name: string;
  prompt: string;
  originalIdx?: number;
}

// Sortable Column Header Component
interface SortableColumnHeaderProps {
  id: number;
  name: string;
  query: string;
  onEdit: () => void;
  onDelete: () => void;
}

const SortableColumnHeader = ({ id, name, query, className = "", onEdit, onDelete }: SortableColumnHeaderProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`text-left p-3 text-xs font-medium text-muted-foreground min-w-[200px] select-none group ${className}`}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-foreground p-1 -ml-1 rounded hover:bg-muted touch-none inline-flex items-center"
          style={{ 
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            msTouchAction: 'none'
          }}
        >
          <GripVertical className="h-3 w-3" />
        </div>
        <span className="truncate flex-1" title={query}>{name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-muted"
            title="Edit column"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/20 text-destructive"
            title="Delete column"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </th>
  );
};

// ============================================
// COMPONENT
// ============================================

const VaultApp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Suppress passive event listener warnings for drag-and-drop
  useEffect(() => {
    const originalWarn = console.warn;
    const passiveWarningPattern = /Unable to preventDefault inside passive event listener/i;
    
    console.warn = (...args: any[]) => {
      if (args.length > 0 && typeof args[0] === 'string' && passiveWarningPattern.test(args[0])) {
        // Suppress this specific warning - it's harmless and comes from dnd-kit's touch handling
        return;
      }
      originalWarn.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
    };
  }, []);

  // View state
  const [view, setView] = useState<"projects" | "project-detail" | "analysis">("projects");
  const [selectedProject, setSelectedProject] = useState<VaultProject | null>(null);
  
  // Filter state
  const [projectFilter, setProjectFilter] = useState<"all" | "private" | "shared" | "library">("all");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  // Dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileSelectDialogOpen, setFileSelectDialogOpen] = useState(false);
  const [columnBuilderOpen, setColumnBuilderOpen] = useState(false);
  const [columnBuilderDialogOpen, setColumnBuilderDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [fileSourceDialogOpen, setFileSourceDialogOpen] = useState(false);
  const [queryTypeDialogOpen, setQueryTypeDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);

  // Selection state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Column configuration
  const [reviewColumns, setReviewColumns] = useState<ColumnConfig[]>([]);
  const [analysisColumns, setAnalysisColumns] = useState<AnalysisColumn[]>([
    { name: "Change of Control Provision", prompt: "Does this document contain any change of control provisions? Answer Yes or No." },
    { name: "Party(ies) Restricted", prompt: "What party or parties are restricted by the change of control provision?" },
    { name: "Definition of Change of Control", prompt: "What is the verbatim definition of 'Change of Control' in the document?" },
    { name: "Change of Control Trigger", prompt: "What triggers the change of control provision?" },
  ]);

  // Upload state
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filesUploaded, setFilesUploaded] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  // Form state
  const [shareEmail, setShareEmail] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Data state (from API instead of Supabase)
  const [projects, setProjects] = useState<VaultProject[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [queries, setQueries] = useState<VaultQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Record<string, Record<string, CellData>>>({});

  // Job polling state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobStatus["progress"] | null>(null);

  // Query history state - track which query is being viewed
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  // Table editing state
  const [columnOrder, setColumnOrder] = useState<number[]>([]);
  const [editingColumnIdx, setEditingColumnIdx] = useState<number | null>(null);
  const [editColumnName, setEditColumnName] = useState("");
  const [editColumnQuery, setEditColumnQuery] = useState("");
  const [addingNewColumn, setAddingNewColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnQuery, setNewColumnQuery] = useState("");

  // PDF Viewer state for citations
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);
  const [viewingSourceSnippet, setViewingSourceSnippet] = useState<string>("");
  const [viewingHighlightBox, setViewingHighlightBox] = useState<CellData["highlightBox"] | undefined>(undefined);
  const [viewingTextContent, setViewingTextContent] = useState<string | null>(null);
  const [viewingTextLoading, setViewingTextLoading] = useState(false);
  const [viewingTextError, setViewingTextError] = useState<string | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfLoadingStatus, setPdfLoadingStatus] = useState<string>("");

  // Verification and assignment state
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verifyingCell, setVerifyingCell] = useState<{ fileId: string; columnId: string } | null>(null);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [verifications, setVerifications] = useState<Record<string, Record<string, boolean>>>({});
  
  // Ask panel state
  const [askPanelExpanded, setAskPanelExpanded] = useState(false);
  const [askQueryMessages, setAskQueryMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
  
  // Mock users list - replace with actual API call
  const [users] = useState([
    { id: '1', email: 'karl.kingma@think.ai', name: 'Karl Kingma', initials: 'K' },
    { id: '2', email: 'maddin@think.ai', name: 'Maddin', initials: 'M' },
    { id: '3', email: 'sandeep@think.ai', name: 'Sandeep', initials: 'S' },
  ]);

  // DnD sensors for column reordering
  // Use PointerSensor which handles both mouse and touch without passive listener issues
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, { 
      coordinateGetter: sortableKeyboardCoordinates 
    })
  );

  // Initialize column order when columns change
  useEffect(() => {
    if (analysisColumns.length > 0 && columnOrder.length !== analysisColumns.length) {
      setColumnOrder(analysisColumns.map((_, idx) => idx));
    }
  }, [analysisColumns.length]);

  // Get ordered columns
  const orderedColumns = useMemo(() => {
    if (columnOrder.length === 0) return analysisColumns;
    return columnOrder.map(idx => ({ ...analysisColumns[idx], originalIdx: idx }));
  }, [analysisColumns, columnOrder]);

  // ============================================
  // DATA FETCHING (API instead of Supabase)
  // ============================================

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const projectList = await vaultApi.projects.list();
      setProjects(projectList);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchFiles = useCallback(async (projectId: string) => {
    try {
      const fileList = await vaultApi.files.list(projectId);
      setFiles(fileList);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    }
  }, []);

  const fetchQueries = useCallback(async (projectId: string) => {
    try {
      const queryList = await vaultApi.queries.list(projectId);
      setQueries(queryList);
    } catch (error) {
      console.error("Error fetching queries:", error);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProject) {
      fetchFiles(selectedProject.id);
      fetchQueries(selectedProject.id);
    }
  }, [selectedProject, fetchFiles, fetchQueries]);

  // ============================================
  // HANDLERS
  // ============================================

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const openProject = (project: VaultProject) => {
    setSelectedProject(project);
    setView("project-detail");
  };

  const handleCreateProject = async (name: string, clientMatter?: string, files?: FileList) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a project",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingProject(true);
    try {
      // Create project with optional client matter
      const newProject = await vaultApi.projects.create(name, undefined, clientMatter);
      
      setProjects([newProject, ...projects]);
      
      // If files were provided, upload them
      if (files && files.length > 0) {
        try {
          const uploadResult = await vaultApi.files.upload(
            newProject.id,
            files,
            (uploaded, total) => {
              // Progress callback can be used for UI feedback
            }
          );
          
          if (uploadResult.files.length > 0) {
            toast({
              title: "Project created",
              description: `"${newProject.name}" has been created with ${uploadResult.files.length} file(s).`,
            });
          }
        } catch (uploadError) {
          console.error("Error uploading files:", uploadError);
          toast({
            title: "Project created",
            description: `"${newProject.name}" has been created, but some files failed to upload.`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Project created",
          description: `"${newProject.name}" has been created.`,
        });
      }
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create project";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error; // Re-throw so dialog can handle it
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await vaultApi.projects.delete(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setView("projects");
      }
      toast({
        title: "Project deleted",
        description: "The project has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    // Validate file count
    if (uploadedFiles.length > MAX_VAULT_FILES) {
      toast({
        title: "Too many files",
        description: `Maximum ${MAX_VAULT_FILES} files allowed per upload. You selected ${uploadedFiles.length} files. Please select fewer files and try again.`,
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Validate file sizes
    const fileArray = Array.from(uploadedFiles);
    const oversizedFiles = fileArray.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.slice(0, 3).map(f => f.name).join(', ');
      const moreCount = oversizedFiles.length > 3 ? ` and ${oversizedFiles.length - 3} more` : '';
      toast({
        title: "Files too large",
        description: `These files exceed the ${MAX_FILE_SIZE_MB}MB limit: ${names}${moreCount}`,
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    console.log('Starting file upload:', {
      projectId: selectedProject.id,
      fileCount: uploadedFiles.length,
      fileNames: fileArray.map(f => f.name)
    });

    setUploadState("uploading");
    setTotalFiles(uploadedFiles.length);
    setFilesUploaded(0);
    setUploadProgress(0);

    try {
      const result = await vaultApi.files.upload(
        selectedProject.id,
        uploadedFiles,
        (uploaded, total) => {
          setFilesUploaded(uploaded);
          setUploadProgress((uploaded / total) * 100);
        }
      );

      console.log('Upload result:', result);
      console.log('Upload errors:', result.errors);

      // Check if all files failed
      if (result.files.length === 0 && result.errors && result.errors.length > 0) {
        // All files failed - treat as error
        const errorMessages = result.errors.map(e => {
          const errorText = typeof e === 'string' ? e : (e.error || e.message || 'Unknown error');
          const fileName = e.fileName || 'File';
          return `${fileName}: ${errorText}`;
        }).join('; ');
        
        console.error('All files failed to upload:', errorMessages);
        setUploadState("idle");
        toast({
          title: "Upload failed",
          description: `All files failed to upload. ${errorMessages}`,
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }

      // Some or all files succeeded
      setUploadState("success");
      
      if (result.files.length > 0) {
        setFiles([...files, ...result.files]);

        // Update project file count
        setSelectedProject({
          ...selectedProject,
          fileCount: selectedProject.fileCount + result.files.length,
        });

        // Refresh files list
        if (selectedProject.id) {
          try {
            const fileList = await vaultApi.files.list(selectedProject.id);
            setFiles(fileList);
          } catch (listError) {
            console.warn('Failed to refresh file list:', listError);
            // Continue anyway - files are already added to state
          }
        }
      }

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map(e => `${e.fileName}: ${e.error}`).join('; ');
        toast({
          title: "Upload completed with errors",
          description: `${result.files.length} file(s) uploaded successfully. ${result.errors.length} failed: ${errorMessages}`,
          variant: result.files.length > 0 ? "default" : "destructive",
        });
      } else {
        toast({
          title: "Files uploaded",
          description: `${result.files.length} file(s) uploaded successfully.`,
        });
      }

      // Reset input
      e.target.value = '';

      // Reset after delay
      setTimeout(() => {
        setUploadState("idle");
        setUploadDialogOpen(false);
      }, 1500);
    } catch (error) {
      console.error("Error uploading files:", error);
      setUploadState("idle");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Reset input on error
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await vaultApi.files.delete(fileId);
      setFiles(files.filter((f) => f.id !== fileId));
      setSelectedFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });

      if (selectedProject) {
        setSelectedProject({
          ...selectedProject,
          fileCount: Math.max(0, selectedProject.fileCount - 1),
        });
      }

      toast({
        title: "File deleted",
        description: "The file has been removed.",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleBulkAnalysis = async () => {
    if (!selectedProject || selectedFiles.size === 0) return;

    setIsAnalyzing(true);
    setFileSelectDialogOpen(false);
    setView("analysis");

    try {
      // Convert analysisColumns to ColumnConfig format
      const columns: ColumnConfig[] = analysisColumns.map((col, idx) => ({
        id: `col-${idx}`,
        type: "free-response" as const,
        name: col.name,
        query: col.prompt,
      }));

      const { jobId, queryId } = await vaultApi.ai.runExtraction(
        selectedProject.id,
        Array.from(selectedFiles),
        columns
      );

      setCurrentJobId(jobId);

      // Poll for completion
      const finalStatus = await vaultApi.jobs.pollUntilComplete(jobId, (status) => {
        setJobProgress(status.progress || null);
      });

      if (finalStatus.status === "done" && finalStatus.result) {
        // Process results - preserve full cell data including sourceSnippet
        const results = finalStatus.result as {
          results: Array<{
            fileId: string;
            fileName: string;
            columns: Record<
              string,
              {
                value: string;
                confidence?: "high" | "medium" | "low";
                sourceSnippet?: string;
                pageNumber?: number;
                highlightBox?: {
                  x: number;
                  y: number;
                  width: number;
                  height: number;
                  pageWidth: number;
                  pageHeight: number;
                  pageNumber?: number;
                };
              }
            >;
          }>;
        };
        const formattedResults: Record<string, Record<string, CellData>> = {};

        for (const fileResult of results.results) {
          formattedResults[fileResult.fileId] = {};
          for (const [colId, colResult] of Object.entries(fileResult.columns)) {
            formattedResults[fileResult.fileId][colId] = {
              value: colResult.value,
              confidence: colResult.confidence,
              sourceSnippet: colResult.sourceSnippet,
              highlightBox: colResult.highlightBox ?? undefined,
            };
          }
        }

        setAnalysisResults(formattedResults);
        toast({
          title: "Analysis complete",
          description: `Analyzed ${selectedFiles.size} files.`,
        });
      } else if (finalStatus.status === "error") {
        throw new Error(finalStatus.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Error running analysis:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setCurrentJobId(null);
      setJobProgress(null);
    }
  };

  const handleLocalUpload = (uploadedFiles: FileList) => {
    // Create a synthetic event to reuse handleFileUpload
    const syntheticEvent = {
      target: { files: uploadedFiles },
    } as React.ChangeEvent<HTMLInputElement>;
    handleFileUpload(syntheticEvent);
  };

  // Load a past query's results
  const handleViewQuery = async (query: VaultQuery) => {
    if (query.status !== 'completed') {
      toast({
        title: "Query not ready",
        description: query.status === 'processing' ? "This query is still processing" : "No results available for this query",
        variant: "destructive",
      });
      return;
    }

    // Handle "ask" type queries differently - they don't have table results
    if (query.queryType === 'ask') {
      setSelectedQueryId(query.id);
      
      // Load the ask query results and populate the Ask panel
      if (query.results) {
        const askResults = query.results as { answer: string; sources?: Array<{ fileId: string; fileName: string; snippet: string }> };
        
        // Set file IDs from the query
        if (query.fileIds && Array.isArray(query.fileIds)) {
          setSelectedFiles(new Set(query.fileIds));
        }
        
        // Populate messages with the previous question and answer
        const messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> = [];
        if (query.queryText) {
          messages.push({
            role: 'user',
            content: query.queryText,
            timestamp: new Date(query.createdAt),
          });
        }
        if (askResults.answer) {
          messages.push({
            role: 'assistant',
            content: askResults.answer,
            timestamp: new Date(query.createdAt), // Use createdAt as fallback
          });
        }
        setAskQueryMessages(messages);
        
        // Expand the Ask panel
        setAskPanelExpanded(true);
      } else {
        // No results yet, clear messages
        setAskQueryMessages([]);
      }
      
      setView("analysis");
      return;
    }

    // Handle "review" type queries - they have table results
    if (!query.results) {
      toast({
        title: "No results",
        description: "This query has no results available",
        variant: "destructive",
      });
      return;
    }

    setSelectedQueryId(query.id);

    // Set the columns from the query
    if (query.columns) {
      setAnalysisColumns(
        query.columns.map((col) => ({
          name: col.name,
          prompt: col.query,
        }))
      );
    }

    // Parse and set the results
    // For review queries, results is an array of ExtractionResult
    // But it might be stored directly as an array or wrapped in an object
    let results: Array<{
      fileId: string;
      fileName: string;
      columns: Record<
        string,
        {
          value: string;
          confidence?: "high" | "medium" | "low";
          sourceSnippet?: string;
          sourceText?: string;
          sourceLocation?: string;
          pageNumber?: number;
          highlightBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
            pageWidth: number;
            pageHeight: number;
            pageNumber?: number;
          };
        }
      >;
    }>;

    // Handle different possible formats
    if (Array.isArray(query.results)) {
      results = query.results;
    } else if (typeof query.results === 'object' && query.results !== null && 'results' in query.results) {
      // Results might be wrapped in { results: [...] }
      const wrapped = query.results as { results: unknown };
      if (Array.isArray(wrapped.results)) {
        results = wrapped.results;
      } else {
        toast({
          title: "Invalid results format",
          description: "Results are not in the expected format",
          variant: "destructive",
        });
        return;
      }
    } else {
      toast({
        title: "Invalid results format",
        description: "Results are not in the expected format",
        variant: "destructive",
      });
      return;
    }

    const formattedResults: Record<string, Record<string, CellData>> = {};
    const fileIdsInQuery = new Set<string>();

    for (const fileResult of results) {
      if (!fileResult || !fileResult.fileId) continue;
      fileIdsInQuery.add(fileResult.fileId);
      formattedResults[fileResult.fileId] = {};
      if (fileResult.columns) {
        for (const [colId, colResult] of Object.entries(fileResult.columns)) {
          formattedResults[fileResult.fileId][colId] = {
            value: colResult.value,
            confidence: colResult.confidence,
            sourceSnippet: colResult.sourceSnippet || colResult.sourceText,
            highlightBox: colResult.highlightBox ?? undefined,
            pageNumber: colResult.pageNumber,
          };
        }
      }
    }

    setSelectedFiles(fileIdsInQuery);
    setAnalysisResults(formattedResults);
    setColumnOrder([]); // Reset column order for new query
    setView("analysis");
  };

  // Export table to Excel
  const handleExportExcel = () => {
    const selectedFilesList = files.filter(f => selectedFiles.has(f.id));
    
    // Build data array with ordered columns
    const data = selectedFilesList.map(file => {
      const row: Record<string, string> = { "Document": file.name };
      orderedColumns.forEach((col, idx) => {
        const originalIdx = (col as any).originalIdx ?? idx;
        const cellData = analysisResults[file.id]?.[`col-${originalIdx}`];
        row[col.name] = cellData?.value || "";
      });
      return row;
    });

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analysis Results");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const projectName = selectedProject?.name.replace(/[^a-z0-9]/gi, "_") || "vault";
    XLSX.writeFile(wb, `${projectName}_analysis_${timestamp}.xlsx`);

    toast({
      title: "Exported to Excel",
      description: `${selectedFilesList.length} rows exported successfully.`,
    });
  };

  // Copy table to clipboard
  const handleCopyTable = async () => {
    const selectedFilesList = files.filter(f => selectedFiles.has(f.id));
    
    // Build tab-separated data
    const headers = ["Document", ...orderedColumns.map(col => col.name)];
    const rows = selectedFilesList.map(file => {
      const cells = [file.name];
      orderedColumns.forEach((col, idx) => {
        const originalIdx = (col as any).originalIdx ?? idx;
        const cellData = analysisResults[file.id]?.[`col-${originalIdx}`];
        cells.push(cellData?.value || "");
      });
      return cells.join("\t");
    });

    const tableText = [headers.join("\t"), ...rows].join("\n");

    try {
      await navigator.clipboard.writeText(tableText);
      toast({
        title: "Copied to clipboard",
        description: "Table data copied. You can paste it into Excel or Google Sheets.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Handle column drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(Number(active.id));
      const newIndex = columnOrder.indexOf(Number(over.id));
      setColumnOrder(arrayMove(columnOrder, oldIndex, newIndex));
    }
  };

  // Handle column header edit
  const handleStartColumnEdit = (colIdx: number) => {
    const col = analysisColumns[colIdx];
    setEditingColumnIdx(colIdx);
    setEditColumnName(col.name);
    setEditColumnQuery(col.prompt);
  };

  const handleSaveColumnEdit = () => {
    if (editingColumnIdx === null) return;
    
    const updatedColumns = [...analysisColumns];
    updatedColumns[editingColumnIdx] = {
      ...updatedColumns[editingColumnIdx],
      name: editColumnName,
      prompt: editColumnQuery,
    };
    setAnalysisColumns(updatedColumns);
    
    setEditingColumnIdx(null);
    setEditColumnName("");
    setEditColumnQuery("");
    
    toast({
      title: "Column updated",
      description: "Column configuration has been updated.",
    });
  };

  const handleCancelColumnEdit = () => {
    setEditingColumnIdx(null);
    setEditColumnName("");
    setEditColumnQuery("");
  };

  // Handle add new column
  const handleStartAddColumn = () => {
    setAddingNewColumn(true);
    setNewColumnName("");
    setNewColumnQuery("");
  };

  const handleSaveNewColumn = () => {
    if (!newColumnName.trim() || !newColumnQuery.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both column name and query.",
        variant: "destructive",
      });
      return;
    }
    
    const newColumn: AnalysisColumn = {
      name: newColumnName.trim(),
      prompt: newColumnQuery.trim(),
    };
    
    setAnalysisColumns([...analysisColumns, newColumn]);
    // Update column order to include new column
    setColumnOrder([...columnOrder, analysisColumns.length]);
    
    setAddingNewColumn(false);
    setNewColumnName("");
    setNewColumnQuery("");
    
    toast({
      title: "Column added",
      description: `"${newColumnName}" has been added. Re-run analysis to populate data.`,
    });
  };

  const handleCancelAddColumn = () => {
    setAddingNewColumn(false);
    setNewColumnName("");
    setNewColumnQuery("");
  };

  const handleDeleteColumn = (colIdx: number) => {
    const updatedColumns = analysisColumns.filter((_, idx) => idx !== colIdx);
    setAnalysisColumns(updatedColumns);
    
    // Update column order
    const updatedOrder = columnOrder
      .filter(idx => idx !== colIdx)
      .map(idx => idx > colIdx ? idx - 1 : idx);
    setColumnOrder(updatedOrder);
    
    toast({
      title: "Column deleted",
      description: "Column has been removed.",
    });
  };

  // Handle viewing source in PDF or Word/text preview
  const handleViewSource = async (fileId: string, sourceSnippet: string, highlightBox?: CellData["highlightBox"]) => {
    const file = files.find(f => f.id === fileId);
    const isPdf = file?.mimeType === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf');
    
    setViewingFileId(fileId);
    setViewingSourceSnippet(sourceSnippet);
    setViewingHighlightBox(highlightBox);
    setPdfViewerOpen(true);
    setPdfBuffer(null);
    setViewingTextContent(null);
    setViewingTextError(null);

    // Only try to load PDF for PDF files
    if (!isPdf) {
      setPdfLoading(false);
      setViewingTextLoading(true);
      try {
        const fullFile = await vaultApi.files.get(fileId);
        const extractedText = fullFile.extractedText || null;
        setViewingTextContent(extractedText || sourceSnippet || null);
      } catch (error) {
        console.error("Error loading extracted text:", error);
        setViewingTextError(
          error instanceof Error ? error.message : "Could not load extracted text"
        );
        setViewingTextContent(sourceSnippet || null);
      } finally {
        setViewingTextLoading(false);
      }
      return;
    }

    setPdfLoading(true);
    setPdfLoadingStatus("Connecting to server...");

    try {
      // Fetch PDF with authentication and timeout
      const token = localStorage.getItem('auth_token');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      setPdfLoadingStatus("Downloading PDF file...");
      const response = await fetch(vaultApi.files.getDownloadUrl(fileId), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error message from response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch document: ${response.status}`);
        }
        throw new Error(`Failed to fetch document: ${response.status}`);
      }

      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      console.log('Downloaded file content-type:', contentType);
      
      setPdfLoadingStatus("Processing PDF data...");
      const buffer = await response.arrayBuffer();
      
      // Simple PDF header check (PDF files start with %PDF)
      const headerView = new Uint8Array(buffer.slice(0, 5));
      const headerString = String.fromCharCode(...headerView);
      if (!headerString.startsWith('%PDF')) {
        console.warn('File does not appear to be a PDF, header:', headerString);
        // Still try to load it - might be a valid PDF with BOM or other prefix
      }
      
      setPdfLoadingStatus("PDF ready");
      setPdfBuffer(buffer);
      // Clear status after a moment
      setTimeout(() => setPdfLoadingStatus(""), 500);
    } catch (error) {
      console.error('Error loading document:', error);
      const errorMessage = error instanceof Error 
        ? (error.name === 'AbortError' ? 'Request timed out. The document may be too large.' : error.message)
        : "Could not load the document";
      setPdfLoadingStatus("");
      toast({
        title: "Failed to load document",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePdfViewer = () => {
    setPdfViewerOpen(false);
    setViewingFileId(null);
    setViewingSourceSnippet("");
    setViewingHighlightBox(undefined);
    setPdfBuffer(null);
    setPdfLoadingStatus("");
    setViewingTextContent(null);
    setViewingTextError(null);
    setViewingTextLoading(false);
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Library Tab Content Component
  const LibraryTabContent = () => {
    const [librarySubTab, setLibrarySubTab] = useState<"prompts" | "playbooks" | "clauses">("prompts");
    
    return (
      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setLibrarySubTab("prompts")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              librarySubTab === "prompts"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Prompts
          </button>
          <button
            onClick={() => setLibrarySubTab("playbooks")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              librarySubTab === "playbooks"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Playbooks
          </button>
          <button
            onClick={() => setLibrarySubTab("clauses")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              librarySubTab === "clauses"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Clauses
          </button>
        </div>
        <div>
          {librarySubTab === "prompts" ? (
            <PromptsView />
          ) : librarySubTab === "playbooks" ? (
            <PlaybooksView />
          ) : (
            <ClausesView />
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: Projects View
  // ============================================

  const renderProjectsView = () => {
    // Filter projects based on selected filter and search query
    const filteredProjects = projects.filter((project) => {
      // Apply visibility filter
      if (projectFilter === "private" && project.visibility !== "private") return false;
      if (projectFilter === "shared" && project.visibility !== "shared") return false;
      if (projectFilter === "library") return false; // Library tab shows different content
      
      // Apply search filter
      if (projectSearchQuery.trim()) {
        const query = projectSearchQuery.toLowerCase();
        return (
          project.name.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query) ||
          project.clientMatter?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Vault</h1>
            <p className="text-muted-foreground">Store and analyze thousands of documents</p>
          </div>
          <Button 
            onClick={() => setCreateProjectDialogOpen(true)}
            type="button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>

        {/* Tabs and Search */}
        <div className="flex items-center justify-between gap-4">
          <Tabs value={projectFilter} onValueChange={(value) => setProjectFilter(value as typeof projectFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="private">Private</TabsTrigger>
              <TabsTrigger value="shared">Shared</TabsTrigger>
              <TabsTrigger value="library">Library</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={projectSearchQuery}
              onChange={(e) => setProjectSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content based on selected tab */}
        {projectFilter === "library" ? (
          <LibraryTabContent />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {projectSearchQuery ? "No projects match your search" : "No projects yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {projectSearchQuery ? "Try a different search term" : "Create your first project to get started"}
            </p>
            {!projectSearchQuery && (
              <Button onClick={() => setCreateProjectDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => openProject(project)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Folder className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    {project.visibility === "shared" && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                        Shared
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-medium text-foreground mb-1">{project.name}</h3>
                {project.clientMatter && (
                  <p className="text-xs text-muted-foreground mb-1">{project.clientMatter}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {project.fileCount} file{project.fileCount !== 1 ? "s" : ""} • Updated {formatRelativeTime(project.updatedAt)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER: Project Detail View
  // ============================================

  const renderProjectDetailView = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setView("projects")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{selectedProject?.name}</h1>
          <p className="text-muted-foreground">{files.length} files</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setFileSourceDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
          <Button onClick={() => setQueryTypeDialogOpen(true)} disabled={files.length === 0}>
            <BarChart3 className="h-4 w-4 mr-2" />
            New Query
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No files yet</h3>
          <p className="text-muted-foreground mb-4">Upload documents to start analyzing</p>
          <Button onClick={() => setFileSourceDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </Card>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground w-12">
                  <Checkbox
                    checked={selectedFiles.size === files.length && files.length > 0}
                    onCheckedChange={() => {
                      if (selectedFiles.size === files.length) {
                        setSelectedFiles(new Set());
                      } else {
                        setSelectedFiles(new Set(files.map((f) => f.id)));
                      }
                    }}
                  />
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Category</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Size</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Added</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? (
                        <FileText className="h-4 w-4 text-red-600" />
                      ) : file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') ? (
                        <FileText className="h-4 w-4 text-blue-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-foreground">{file.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {file.documentType && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                          {file.documentType}
                        </span>
                      )}
                      {file.category && (
                        <span className="text-xs px-2 py-1 bg-muted rounded-full">{file.category}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{formatFileSize(file.sizeBytes)}</td>
                  <td className="p-3 text-sm text-muted-foreground">{formatRelativeTime(file.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(vaultApi.files.getDownloadUrl(file.id), "_blank")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Query History Section */}
      {queries.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Query History</h2>
            <span className="text-sm text-muted-foreground">{queries.length} past queries</span>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Query</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {queries.map((query) => (
                  <tr key={query.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {query.queryType === 'review' ? (
                          <BarChart3 className="h-4 w-4 text-primary" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="text-sm capitalize">{query.queryType}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-foreground truncate max-w-xs block">
                        {query.queryType === 'review' && query.columns
                          ? `${query.columns.length} columns: ${query.columns.slice(0, 2).map(c => c.name).join(', ')}${query.columns.length > 2 ? '...' : ''}`
                          : query.queryText || 'N/A'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        query.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        query.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        query.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {query.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{formatRelativeTime(query.createdAt)}</td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewQuery(query)}
                        disabled={query.status !== 'completed'}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedFiles.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{selectedFiles.size} file(s) selected</span>
          <Button onClick={() => setQueryTypeDialogOpen(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analyze Selected
          </Button>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: Analysis View
  // ============================================

  // Generate citation numbers based on source location
  const citationNumbers = useMemo(() => {
    const citationMap = new Map<string, number>();
    let nextNumber = 1;

    // Iterate through all analysis results to assign consistent numbers
    Object.entries(analysisResults).forEach(([fileId, columns]) => {
      Object.entries(columns).forEach(([columnId, cellData]) => {
        if (cellData && typeof cellData === 'object' && cellData.sourceSnippet) {
          // Create a unique key based on file, page, and source snippet
          const pageNum = cellData.highlightBox?.pageNumber || cellData.pageNumber || 0;
          // Use first 50 chars of snippet as identifier for same paragraph
          const snippetKey = cellData.sourceSnippet.substring(0, 50).trim();
          const citationKey = `${fileId}:${pageNum}:${snippetKey}`;
          
          if (!citationMap.has(citationKey)) {
            citationMap.set(citationKey, nextNumber++);
          }
        }
      });
    });

    return citationMap;
  }, [analysisResults]);

  const getCitationNumber = (fileId: string, cellData: any): number | undefined => {
    if (!cellData || typeof cellData !== 'object' || !cellData.sourceSnippet) {
      return undefined;
    }
    const pageNum = cellData.highlightBox?.pageNumber || cellData.pageNumber || 0;
    const snippetKey = cellData.sourceSnippet.substring(0, 50).trim();
    const citationKey = `${fileId}:${pageNum}:${snippetKey}`;
    return citationNumbers.get(citationKey);
  };

  const renderAnalysisView = () => {
    const viewingQuery = selectedQueryId ? queries.find(q => q.id === selectedQueryId) : null;
    
    return (
    <div className="relative h-screen overflow-hidden flex">
      {/* Ask Panel - side panel */}
      {selectedQueryId && selectedProject && (
        <AskTablePanel
          queryId={selectedQueryId}
          projectId={selectedProject.id}
          fileIds={Array.from(selectedFiles)}
          columnCount={analysisColumns.length}
          rowCount={selectedFiles.size}
          tableName={selectedProject?.name || "Review table"}
          isExpanded={askPanelExpanded}
          onExpandedChange={setAskPanelExpanded}
          initialMessages={askQueryMessages.map((msg, idx) => ({
            id: `${selectedQueryId}-${idx}`,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }))}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6 relative">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => {
          setView("project-detail");
          setSelectedQueryId(null);
          setAskQueryMessages([]); // Clear ask messages when leaving analysis view
        }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Analysis Results</h1>
          <p className="text-muted-foreground">
            {selectedFiles.size} files analyzed
            {viewingQuery && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-muted rounded">
                {formatRelativeTime(viewingQuery.createdAt)}
              </span>
            )}
          </p>
        </div>
        {/* Ask Think AI Button - shown when panel is collapsed */}
        {selectedQueryId && !askPanelExpanded && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAskPanelExpanded(true)}
            className="shadow-lg"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Ask Think AI
          </Button>
        )}
      </div>

      {isAnalyzing ? (
        <Card className="p-12 text-center">
          <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
          <h3 className="text-lg font-medium mb-2">Analyzing documents...</h3>
          {jobProgress ? (
            <div className="max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-2">{jobProgress.stepName}</p>
              <Progress value={(jobProgress.currentStep / jobProgress.totalSteps) * 100} />
              <p className="text-xs text-muted-foreground mt-2">
                {jobProgress.currentStep} of {jobProgress.totalSteps} files processed
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-2">Starting analysis...</p>
              <Progress value={0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Preparing {selectedFiles.size} files for analysis
              </p>
            </div>
          )}
        </Card>
      ) : Object.keys(analysisResults).length > 0 ? (
        <div className="space-y-4">
          {/* Export and Copy Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Drag headers to reorder • Hover headers to edit/delete • Click refs to view source
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleStartAddColumn}>
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyTable}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Table
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Results Table with DnD */}
          <div className="border border-border rounded-lg overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10">
                      Document
                    </th>
                    <SortableContext
                      items={columnOrder.length > 0 ? columnOrder : analysisColumns.map((_, i) => i)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {orderedColumns.map((col, idx) => {
                        const originalIdx = (col as any).originalIdx ?? orderedColumns.indexOf(col);
                        const colId = columnOrder.length > 0 ? columnOrder[orderedColumns.indexOf(col)] : orderedColumns.indexOf(col);
                        // Alternate column colors
                        const bgColor = idx % 2 === 0 ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'bg-green-50/50 dark:bg-green-950/20';
                        return (
                          <SortableColumnHeader
                            key={colId}
                            id={colId}
                            name={col.name}
                            query={col.prompt}
                            className={bgColor}
                            onEdit={() => handleStartColumnEdit(originalIdx)}
                            onDelete={() => handleDeleteColumn(originalIdx)}
                          />
                        );
                      })}
                    </SortableContext>
                  </tr>
                </thead>
                <tbody>
                  {files
                    .filter((f) => selectedFiles.has(f.id))
                    .map((file) => (
                      <tr key={file.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-3 sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-2">
                            {file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? (
                              <FileText className="h-4 w-4 text-red-600" />
                            ) : file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') ? (
                              <FileText className="h-4 w-4 text-blue-600" />
                            ) : (
                              <FileText className="h-4 w-4 text-destructive" />
                            )}
                            <span className="text-sm font-medium">{file.name}</span>
                            {showAssignment && (
                              <AssignmentDropdown
                                assignedTo={Object.values(assignments[file.id] || {})[0]}
                                users={users}
                                onAssign={(userId) => {
                                  setAssignments(prev => ({
                                    ...prev,
                                    [file.id]: { default: userId || '' }
                                  }));
                                }}
                              />
                            )}
                          </div>
                        </td>
                        {orderedColumns.map((col, displayIdx) => {
                          const originalIdx = (col as any).originalIdx ?? displayIdx;
                          const cellData = analysisResults[file.id]?.[`col-${originalIdx}`];
                          const bgColor = displayIdx % 2 === 0 ? 'bg-blue-50/30 dark:bg-blue-950/10' : 'bg-green-50/30 dark:bg-green-950/10';
                          
                          return (
                            <td key={displayIdx} className={`p-3 text-sm text-foreground ${bgColor}`}>
                              <div className="flex items-center gap-2">
                                {!cellData && isAnalyzing ? (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span className="text-xs">Generating output...</span>
                                  </div>
                                ) : (
                                  <>
                                    <CitationCell 
                                      data={cellData} 
                                      fileName={file.name}
                                      fileId={file.id}
                                      citationNumber={getCitationNumber(file.id, cellData)}
                                      onViewSource={handleViewSource}
                                    />
                                    {showVerification && cellData && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => {
                                          setVerifyingCell({ fileId: file.id, columnId: `col-${originalIdx}` });
                                          setVerificationModalOpen(true);
                                        }}
                                      >
                                        <CheckCircle2 className={cn(
                                          "h-4 w-4",
                                          verifications[file.id]?.[`col-${originalIdx}`] 
                                            ? "text-green-600" 
                                            : "text-muted-foreground"
                                        )} />
                                      </Button>
                                    )}
                                    {showAssignment && (
                                      <AssignmentDropdown
                                        assignedTo={assignments[file.id]?.[`col-${originalIdx}`]}
                                        users={users}
                                        onAssign={(userId) => {
                                          setAssignments(prev => ({
                                            ...prev,
                                            [file.id]: {
                                              ...prev[file.id],
                                              [`col-${originalIdx}`]: userId || ''
                                            }
                                          }));
                                        }}
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </DndContext>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No results yet</h3>
          <p className="text-muted-foreground">Run an analysis to see results here</p>
        </Card>
      )}
      </div>
    </div>
  );
};

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-background">
      {view === "projects" && renderProjectsView()}
      {view === "project-detail" && renderProjectDetailView()}
      {view === "analysis" && renderAnalysisView()}

      {/* Upload Progress Dialog */}
      <Dialog open={uploadState === "uploading"} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md" 
          onPointerDownOutside={(e) => {
            // Prevent closing during upload
            if (uploadState === "uploading" && e.detail.originalEvent && e.detail.originalEvent.cancelable) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (uploadState === "uploading") {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Uploading Files
            </DialogTitle>
            <DialogDescription>
              Please wait while your files are being uploaded and processed...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{filesUploaded} of {totalFiles} files</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Large files may take longer to process
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Success Toast - shown briefly */}
      {uploadState === "success" && (
        <Dialog open={true} onOpenChange={() => setUploadState("idle")}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Upload Complete
              </DialogTitle>
              <DialogDescription>
                {totalFiles} file{totalFiles !== 1 ? "s" : ""} uploaded successfully.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}

      {/* Analysis Progress Floating Indicator - shows on all views when analyzing */}
      {isAnalyzing && view !== "analysis" && (
        <div className="fixed bottom-6 right-6 bg-background border border-border rounded-lg shadow-lg p-4 max-w-sm z-50">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Analyzing {selectedFiles.size} files...</p>
              {jobProgress ? (
                <>
                  <p className="text-xs text-muted-foreground truncate mt-1">{jobProgress.stepName}</p>
                  <Progress value={(jobProgress.currentStep / jobProgress.totalSteps) * 100} className="h-1.5 mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {jobProgress.currentStep} of {jobProgress.totalSteps} processed
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mt-1">Starting...</p>
                  <Progress value={0} className="h-1.5 mt-2" />
                </>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-shrink-0"
              onClick={() => setView("analysis")}
            >
              View
            </Button>
          </div>
        </div>
      )}

      {/* File Source Dialog */}
      <FileSourceDialog
        open={fileSourceDialogOpen}
        onOpenChange={setFileSourceDialogOpen}
        onLocalUpload={handleLocalUpload}
      />

      {/* Query Type Dialog */}
      <QueryTypeDialog
        open={queryTypeDialogOpen}
        onOpenChange={setQueryTypeDialogOpen}
        selectedFilesCount={selectedFiles.size}
        onSelectType={(type) => {
          if (type === "review") {
            setColumnBuilderDialogOpen(true);
          } else {
            toast({
              title: "Ask Query",
              description: "Opening collective query mode...",
            });
            // TODO: Implement ask query flow
          }
        }}
      />

      {/* Column Builder Dialog */}
      <ColumnBuilderDialog
        open={columnBuilderDialogOpen}
        onOpenChange={setColumnBuilderDialogOpen}
        documentType={selectedProject ? files.find(f => f.documentType)?.documentType : undefined}
        onColumnsConfirmed={(columns) => {
          setReviewColumns(columns);
          setAnalysisColumns(
            columns.map((col) => ({
              name: col.name,
              prompt: col.query,
            }))
          );
          setFileSelectDialogOpen(true);
        }}
      />

      {/* File Selection Dialog */}
      <Dialog open={fileSelectDialogOpen} onOpenChange={setFileSelectDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted rounded">
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedProject?.name}</DialogTitle>
                <DialogDescription>{files.length} files available</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Select files to analyze</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedFiles.size === files.length) {
                    setSelectedFiles(new Set());
                  } else {
                    setSelectedFiles(new Set(files.map((f) => f.id)));
                  }
                }}
              >
                {selectedFiles.size === files.length ? "Deselect all" : "Select all"}
              </Button>
            </div>

            <div className="border border-border rounded-lg max-h-96 overflow-auto">
              {files.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No files in this project yet. Upload files first.</p>
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center space-x-3 p-3 hover:bg-muted/30 border-b border-border cursor-pointer"
                    onClick={() => toggleFileSelection(file.id)}
                  >
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                    />
                    {file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? (
                      <FileText className="h-4 w-4 text-red-600" />
                    ) : file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') ? (
                      <FileText className="h-4 w-4 text-blue-600" />
                    ) : (
                      <FileText className="h-4 w-4 text-destructive" />
                    )}
                    <span className="flex-1 text-sm text-foreground">{file.name}</span>
                    {file.documentType && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                        {file.documentType}
                      </span>
                    )}
                    {file.category && (
                      <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full">
                        {file.category}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <p className="text-sm text-muted-foreground">{selectedFiles.size} selected</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setFileSelectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAnalysis} disabled={selectedFiles.size === 0}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analyze {selectedFiles.size} files
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Column Dialog */}
      <Dialog open={editingColumnIdx !== null} onOpenChange={(open) => !open && handleCancelColumnEdit()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
            <DialogDescription>
              Modify the column name and query. Re-run analysis to see updated results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Column Name</label>
              <Input
                value={editColumnName}
                onChange={(e) => setEditColumnName(e.target.value)}
                placeholder="e.g., Contract Type"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Query / Prompt</label>
              <Textarea
                value={editColumnQuery}
                onChange={(e) => setEditColumnQuery(e.target.value)}
                placeholder="e.g., What type of contract is this document?"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This prompt will be used to extract data from each document.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelColumnEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveColumnEdit} disabled={!editColumnName.trim() || !editColumnQuery.trim()}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Column Dialog */}
      <Dialog open={addingNewColumn} onOpenChange={(open) => !open && handleCancelAddColumn()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogDescription>
              Create a new column with a custom query. You'll need to re-run analysis to populate data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Column Name</label>
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="e.g., Termination Clause"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Query / Prompt</label>
              <Textarea
                value={newColumnQuery}
                onChange={(e) => setNewColumnQuery(e.target.value)}
                placeholder="e.g., What are the termination conditions in this contract?"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This prompt will be used to extract data from each document.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelAddColumn}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewColumn} disabled={!newColumnName.trim() || !newColumnQuery.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        onCreateProject={handleCreateProject}
      />

      {/* Verification Modal */}
      {verifyingCell && (
        <VerificationModal
          open={verificationModalOpen}
          onOpenChange={setVerificationModalOpen}
          file={files.find(f => f.id === verifyingCell.fileId) || null}
          cellData={analysisResults[verifyingCell.fileId]?.[verifyingCell.columnId]}
          onVerify={(verified) => {
            setVerifications(prev => ({
              ...prev,
              [verifyingCell.fileId]: {
                ...prev[verifyingCell.fileId],
                [verifyingCell.columnId]: verified
              }
            }));
          }}
          onFlag={() => {}}
          onRate={(rating) => {}}
          assignedTo={assignments[verifyingCell.fileId]?.[verifyingCell.columnId]}
          onAssign={(userId) => {
            setAssignments(prev => ({
              ...prev,
              [verifyingCell.fileId]: {
                ...prev[verifyingCell.fileId],
                [verifyingCell.columnId]: userId || ''
              }
            }));
          }}
        />
      )}

      {/* PDF Viewer Dialog for Citations */}
      <Dialog open={pdfViewerOpen} onOpenChange={(open) => !open && handleClosePdfViewer()}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-destructive" />
              {viewingFileId ? files.find(f => f.id === viewingFileId)?.name : "Document Viewer"}
            </DialogTitle>
            <DialogDescription>
              Viewing source reference in document
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Source Snippet Panel */}
            <div className="w-80 border-r bg-muted/30 p-4 flex flex-col">
              <h3 className="text-sm font-medium mb-2">Referenced Text</h3>
              <div className="flex-1 overflow-auto">
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60 rounded-full" />
                  <div className="pl-3">
                    <p className="text-sm text-foreground leading-relaxed italic">
                      "{viewingSourceSnippet}"
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                The highlighted section in the PDF shows where this text was extracted from.
              </p>
            </div>
            
            {/* PDF Viewer Panel */}
            <div className="flex-1 overflow-hidden min-h-0">
              {(() => {
                const file = viewingFileId ? files.find(f => f.id === viewingFileId) : null;
                const isPdf = file?.mimeType === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf');
                
                if (pdfLoading) {
                  return (
                    <div className="h-full flex items-center justify-center bg-muted/20">
                      <div className="text-center space-y-4 max-w-sm">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Loading PDF document</p>
                          <p className="text-xs text-muted-foreground">
                            {pdfLoadingStatus || "Preparing document..."}
                          </p>
                        </div>
                        <div className="w-48 bg-muted rounded-full h-1.5 mx-auto overflow-hidden">
                          <div className="bg-primary h-full animate-pulse transition-all duration-500" style={{ width: '60%' }} />
                        </div>
                      </div>
                    </div>
                  );
                }
                
                if (pdfBuffer && isPdf) {
                  // Normalize highlight box format if provided
                  const normalizedHighlight = viewingHighlightBox ? {
                    x: viewingHighlightBox.x || 0,
                    y: viewingHighlightBox.y || 0,
                    width: viewingHighlightBox.width || 0,
                    height: viewingHighlightBox.height || 0,
                    pageWidth: viewingHighlightBox.pageWidth || 612,
                    pageHeight: viewingHighlightBox.pageHeight || 792,
                    pageNumber: viewingHighlightBox.pageNumber || 1,
                  } : undefined;
                  
                  return (
                    <div className="h-full w-full relative min-h-0">
                      <PdfViewer
                        fileBuffer={pdfBuffer}
                        highlight={normalizedHighlight}
                        highlightText={viewingSourceSnippet}
                        scale={1.2}
                      />
                    </div>
                  );
                }
                
                if (!isPdf && file) {
                  // Non-PDF file - show text-based preview with highlights
                  return (
                    <div className="h-full flex flex-col bg-muted/10">
                      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Word/Text Preview</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(vaultApi.files.getDownloadUrl(file.id), "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Original
                        </Button>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {viewingTextLoading ? (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center space-y-3">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                              <p className="text-sm text-muted-foreground">Loading document preview…</p>
                            </div>
                          </div>
                        ) : viewingTextError ? (
                          <div className="h-full flex items-center justify-center p-6">
                            <div className="text-center max-w-md">
                              <p className="text-sm text-destructive mb-2">Failed to load full preview</p>
                              <p className="text-xs text-muted-foreground mb-4">{viewingTextError}</p>
                              <div className="bg-background border rounded-lg p-4 text-left">
                                <p className="text-xs text-muted-foreground mb-2">Extracted text containing reference:</p>
                                <div className="relative">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60 rounded-full" />
                                  <div className="pl-3">
                                    <p className="text-sm text-foreground leading-relaxed italic">
                                      "{viewingSourceSnippet}"
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : viewingTextContent ? (
                          <DocumentViewer
                            content={viewingTextContent}
                            citation={{ text: viewingSourceSnippet, filePath: file.name }}
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center p-6">
                            <div className="text-center max-w-md">
                              <p className="text-sm text-muted-foreground mb-4">
                                No extracted text is available for this document.
                              </p>
                              <div className="bg-background border rounded-lg p-4 text-left">
                                <p className="text-xs text-muted-foreground mb-2">Extracted text containing reference:</p>
                                <div className="relative">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60 rounded-full" />
                                  <div className="pl-3">
                                    <p className="text-sm text-foreground leading-relaxed italic">
                                      "{viewingSourceSnippet}"
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Could not load document</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VaultApp;
