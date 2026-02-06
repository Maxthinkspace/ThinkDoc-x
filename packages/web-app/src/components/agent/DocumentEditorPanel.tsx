import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Undo,
  Redo,
  X,
  Eye,
  FileText,
  Copy,
  Download,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import VersionDropdown from "./VersionDropdown";
import SourcesPanel, { type SourceFile } from "./SourcesPanel";
import PdfViewerPanel from "./PdfViewerPanel";
import TrackChangesView from "./TrackChangesView";

interface DocumentEditorPanelProps {
  documentId?: string;
  content: string;
  originalContent?: string; // Original content for track changes comparison
  onContentChange?: (content: string) => void;
  onClose?: () => void;
  sources?: SourceFile[];
  onPageClick?: (sourceId: string, pageNumber: number) => void;
  showEdits?: boolean;
  onShowEditsToggle?: (show: boolean) => void;
  currentVersionId?: string;
  onVersionSelect?: (versionId: string, isSubVersion: boolean) => void;
  className?: string;
}

export default function DocumentEditorPanel({
  documentId,
  content,
  originalContent,
  onContentChange,
  onClose,
  sources = [],
  onPageClick,
  showEdits = false,
  onShowEditsToggle,
  currentVersionId,
  onVersionSelect,
  className,
}: DocumentEditorPanelProps) {
  const [showSources, setShowSources] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{ id: string; page: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorContent, setEditorContent] = useState(content);
  const [initialContent] = useState(content); // Store initial content for comparison

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setEditorContent(newContent);
      onContentChange?.(newContent);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editorContent.replace(/<[^>]*>/g, ""));
  };

  const handleDownload = () => {
    const blob = new Blob([editorContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePageClick = (sourceId: string, pageNumber: number) => {
    setSelectedSource({ id: sourceId, page: pageNumber });
    setShowSources(false);
    onPageClick?.(sourceId, pageNumber);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <select className="text-sm px-2 py-1 rounded border border-border bg-background">
            <option>Paragraph</option>
            <option>Heading 1</option>
            <option>Heading 2</option>
            <option>Heading 3</option>
          </select>
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("bold")}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("italic")}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("underline")}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("strikeThrough")}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("justifyLeft")}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("justifyCenter")}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("justifyRight")}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("justifyFull")}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("insertUnorderedList")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("insertOrderedList")}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCommand("createLink", prompt("Enter URL:"))}
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShowEditsToggle?.(!showEdits)}
            className={cn("h-7", showEdits && "bg-muted")}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Show edits
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSources(!showSources)}
            className={cn("h-7", showSources && "bg-muted")}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Sources
          </Button>
          {documentId && (
            <VersionDropdown
              documentId={documentId}
              currentVersionId={currentVersionId}
              onVersionSelect={onVersionSelect}
            />
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Beta Feedback Banner */}
      <div className="px-4 py-2 bg-yellow-50/50 border-b border-yellow-200/50 flex items-center justify-between">
        <span className="text-xs text-yellow-800">
          <span className="font-semibold">Beta</span> Your feedback helps us make this feature better. Tell us what you think.
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-xs text-yellow-800 hover:text-yellow-900">
          Send feedback
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        {!selectedSource && (
          <ScrollArea className="flex-1">
            <div className="p-8 max-w-4xl mx-auto">
              {showEdits && (originalContent || initialContent !== editorContent) ? (
                <TrackChangesView
                  originalContent={originalContent || initialContent.replace(/<[^>]*>/g, "")}
                  modifiedContent={editorContent.replace(/<[^>]*>/g, "")}
                  className="min-h-[600px]"
                />
              ) : (
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleContentChange}
                  className="prose prose-sm max-w-none focus:outline-none min-h-[600px]"
                  dangerouslySetInnerHTML={{ __html: editorContent }}
                />
              )}
            </div>
          </ScrollArea>
        )}

        {/* PDF Viewer */}
        {selectedSource && (
          <PdfViewerPanel
            sourceId={selectedSource.id}
            initialPage={selectedSource.page}
            onClose={() => setSelectedSource(null)}
          />
        )}

        {/* Sources Panel */}
        {showSources && !selectedSource && (
          <div className="w-64 border-l border-border">
            <SourcesPanel sources={sources} onPageClick={handlePageClick} />
          </div>
        )}
      </div>
    </div>
  );
}

