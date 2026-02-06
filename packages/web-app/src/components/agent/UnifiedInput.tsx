import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Briefcase, Sparkles, Eye, Folder, Loader2, FileText, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import FilesSourcesDropdown from "./FilesSourcesDropdown";
import FilePreviewDialog from "./FilePreviewDialog";
import { apiClient } from "@/services/api";

interface FileChip {
  id: string;
  name: string;
  isFolder?: boolean;
  fileCount?: number;
  file?: File;
}

interface UnifiedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  files?: FileChip[];
  onRemoveFile?: (id: string) => void;
  onFilesClick?: () => void;
  onFolderClick?: () => void;
  onVaultFileSelect?: (fileId: string, projectId: string, fileName: string) => void;
  onVaultFolderSelect?: (projectId: string, projectName: string, fileIds: string[]) => void;
  onPromptsClick?: () => void;
  onImproveClick?: (improvedQuery: string) => void;
  deepResearch?: boolean;
  onDeepResearchToggle?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function UnifiedInput({
  value,
  onChange,
  onSubmit,
  files = [],
  onRemoveFile,
  onFilesClick,
  onFolderClick,
  onVaultFileSelect,
  onVaultFolderSelect,
  onPromptsClick,
  onImproveClick,
  deepResearch = false,
  onDeepResearchToggle,
  disabled = false,
  placeholder = "Ask Think AI anything...",
}: UnifiedInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [clientMatter, setClientMatter] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; name: string; buffer?: ArrayBuffer } | null>(null);
  const [fileBuffers, setFileBuffers] = useState<Map<string, ArrayBuffer>>(new Map());
  const { toast } = useToast();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  // Get file type icon
  const getFileIcon = (fileName: string, fileType?: string, isFolder?: boolean) => {
    if (isFolder) {
      return <Folder className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.pdf') || fileType?.includes('pdf')) {
      return <FileText className="h-3.5 w-3.5 text-red-600" />;
    }
    if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx') || fileType?.includes('word') || fileType?.includes('document')) {
      return <FileText className="h-3.5 w-3.5 text-blue-600" />;
    }
    return <File className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  // Handle file click to preview
  const handleFileClick = async (fileChip: FileChip) => {
    if (fileChip.isFolder) {
      // Don't preview folders
      return;
    }

    if (fileChip.file) {
      // Local file - check if we have buffer, otherwise load it
      let buffer = fileBuffers.get(fileChip.id);
      if (!buffer && fileChip.file.type.includes('pdf')) {
        buffer = await fileChip.file.arrayBuffer();
        setFileBuffers(prev => {
          const newMap = new Map(prev);
          newMap.set(fileChip.id, buffer!);
          return newMap;
        });
      }
      setPreviewFile({ file: fileChip.file, name: fileChip.name, buffer });
    } else {
      // Vault file - would need to fetch it
      toast({
        title: "Preview unavailable",
        description: "Vault file preview is not yet supported in this view.",
      });
    }
  };

  const handleImprove = async () => {
    if (!value.trim() || isImproving) return;

    setIsImproving(true);
    try {
      // Call a simple improvement endpoint or use client-side improvement
      // For now, use client-side improvement with better logic
      const improved = await improveQueryWithAI(value.trim());
      onChange(improved);
      onImproveClick?.(improved);
      toast({
        title: "Query improved",
        description: "Your query has been enhanced for better results.",
      });
    } catch (error) {
      console.error("Error improving query:", error);
      // Fallback: Use a simple client-side improvement
      const improved = improveQueryClientSide(value.trim());
      onChange(improved);
      onImproveClick?.(improved);
      toast({
        title: "Query improved",
        description: "Your query has been enhanced.",
      });
    } finally {
      setIsImproving(false);
    }
  };

  // AI-powered query improvement
  const improveQueryWithAI = async (query: string): Promise<string> => {
    try {
      // Try to use the ask API with a focused improvement prompt
      const improvePrompt = `Improve the following query to be more specific, clear, and effective for an AI legal assistant. Make it more detailed and structured. Return ONLY the improved query, no explanations.

Query: "${query}"`;

      const response = await fetch(`${apiClient.baseUrl}/api/ask/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          question: improvePrompt,
          sourceConfig: {
            includeDocument: false,
            enableWebSearch: false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      if (!response.ok || !response.body) {
        throw new Error("API request failed");
      }

      // Read streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let improvedQuery = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          
          try {
            const parsed = JSON.parse(jsonStr);
            // Handle backend format
            if (parsed.type === 'content' && parsed.text) {
              improvedQuery += parsed.text;
            }
            // Fallback to OpenAI format
            else if (parsed.choices?.[0]?.delta?.content) {
              improvedQuery += parsed.choices[0].delta.content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      // Clean up the response
      let cleaned = improvedQuery
        .replace(/Query:.*/gi, '')
        .replace(/Improved query:/gi, '')
        .replace(/Here.*improved query:/gi, '')
        .replace(/^["']|["']$/g, '')
        .trim();
      
      // If cleaned result is too short or seems wrong, fall back to client-side
      if (!cleaned || cleaned.length < query.length * 0.5) {
        throw new Error("Invalid response");
      }
      
      return cleaned;
    } catch (error) {
      // Fallback to client-side improvement
      throw error;
    }
  };

  // Client-side fallback improvement function
  const improveQueryClientSide = (query: string): string => {
    let improved = query.trim();
    
    // Ensure proper capitalization
    if (improved.length > 0) {
      improved = improved.charAt(0).toUpperCase() + improved.slice(1);
    }
    
    // Add action verbs if missing
    const actionVerbs = ['analyze', 'explain', 'summarize', 'identify', 'compare', 'review', 'draft', 'evaluate'];
    const hasActionVerb = actionVerbs.some(verb => improved.toLowerCase().includes(verb));
    
    if (!hasActionVerb && improved.length > 10) {
      // Add appropriate action verb based on query content
      if (improved.toLowerCase().includes('what') || improved.toLowerCase().includes('how')) {
        improved = `Please explain ${improved.toLowerCase()}`;
      } else if (improved.toLowerCase().includes('compare') || improved.toLowerCase().includes('difference')) {
        improved = `Please compare and analyze: ${improved}`;
      } else {
        improved = `Please analyze and provide insights on: ${improved}`;
      }
    }
    
    // Ensure proper punctuation
    if (!improved.match(/[.!?]$/)) {
      improved += ".";
    }
    
    return improved;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Set client matter */}
      {clientMatter ? (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Set client matter</span>
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100"
          >
            {clientMatter}
            <button
              onClick={() => setClientMatter(null)}
              className="ml-2 hover:text-red-900"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => {
              // TODO: Open client matter selector
              setClientMatter("Cyprus_UK_2018_protocol_in...");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Set client matter
          </button>
        </div>
      )}

      {/* Unified Input Card */}
      <div className="bg-muted/30 rounded-2xl p-6 border border-border/50 shadow-sm">
        {/* File chips */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {files.map((fileChip) => (
              <Badge
                key={fileChip.id}
                variant="secondary"
                className={cn(
                  "rounded-full px-3 py-1.5 bg-background/80 hover:bg-background flex items-center gap-1.5",
                  fileChip.file && !fileChip.isFolder && "cursor-pointer"
                )}
                onClick={() => handleFileClick(fileChip)}
              >
                {getFileIcon(fileChip.name, fileChip.type, fileChip.isFolder)}
                <span className="max-w-[200px] truncate">{fileChip.name}</span>
                {fileChip.isFolder && fileChip.fileCount && (
                  <span className="text-xs opacity-70">({fileChip.fileCount} files)</span>
                )}
                {onRemoveFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(fileChip.id);
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[120px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-4">
            <FilesSourcesDropdown
              onUploadFiles={onFilesClick}
              onUploadFolder={onFolderClick}
              onVaultFileSelect={onVaultFileSelect}
              onVaultFolderSelect={onVaultFolderSelect}
              onWebSearch={() => {}}
              onEDGAR={() => {}}
              onEURLex={() => {}}
              onMemos={() => {}}
              trigger={
                <button
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <span className="text-lg">+</span>
                  Files and sources
                </button>
              }
            />
            <button
              onClick={onPromptsClick}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <span className="text-lg">≡</span>
              Prompts
            </button>
            <button
              onClick={handleImprove}
              disabled={!value.trim() || isImproving || disabled}
              className={cn(
                "text-sm transition-colors flex items-center gap-1.5",
                !value.trim() || isImproving || disabled
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isImproving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Improve
            </button>
          </div>

          <div className="flex items-center gap-3">
            {onDeepResearchToggle && (
              <button
                onClick={onDeepResearchToggle}
                className={cn(
                  "text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                  deepResearch
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="h-4 w-4" />
                Deep research
              </button>
            )}
            <Button
              onClick={onSubmit}
              disabled={!value.trim() || disabled}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-lg px-6"
            >
              Ask Think AI
            </Button>
          </div>
        </div>
      </div>

      {/* File Preview Dialog */}
      {previewFile && (
        <FilePreviewDialog
          open={!!previewFile}
          onOpenChange={(open) => {
            if (!open) setPreviewFile(null);
          }}
          file={previewFile.file}
          fileName={previewFile.name}
          fileBuffer={previewFile.buffer}
        />
      )}
    </div>
  );
}

