import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import DocumentViewer, { type Citation as DocCitation, type DocumentViewerRef } from "./DocumentViewer";
import PdfViewer, { type HighlightBox, type PdfViewerRef } from "./PdfViewer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SourceCitation {
  id: number;
  type: "document" | "vault" | "web" | "playbook";
  title: string;
  snippet: string;
  fullContent?: string;
  url?: string;
  fileId?: string;
  filePath?: string;
  isPDF?: boolean;
  paragraphIndex?: number;
  pageNumber?: number;
  highlightBox?: HighlightBox;
}

interface SourceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citation: SourceCitation | null;
  onFetchFile?: (fileId: string) => Promise<{ buffer: ArrayBuffer; mimeType: string }>;
  uploadedFileBuffers?: Map<string, { buffer: ArrayBuffer; name: string; type: string }>;
}

export default function SourceDrawer({
  open,
  onOpenChange,
  citation,
  onFetchFile,
  uploadedFileBuffers,
}: SourceDrawerProps) {
  const [drawerWidth, setDrawerWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<PdfViewerRef>(null);
  const docViewerRef = useRef<DocumentViewerRef>(null);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(320, Math.min(900, e.clientX));
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  // Scroll to highlight/citation when drawer opens or citation changes
  useEffect(() => {
    if (!open || !citation) return;

    // Wait for viewer to mount, then scroll to highlight
    // Use a longer delay for PDFs to ensure canvas rendering is complete
    const delay = citation.isPDF ? 300 : 150;
    const timer = setTimeout(() => {
      const isPDF = citation.isPDF || 
                    citation.filePath?.toLowerCase().endsWith(".pdf") ||
                    (citation.fileId && uploadedFileBuffers?.has(citation.fileId));
      
      if (isPDF && pdfViewerRef.current) {
        // Prioritize highlightBox if available (most precise)
        if (citation.highlightBox) {
          console.log('Scrolling PDF to highlightBox:', citation.highlightBox);
          pdfViewerRef.current.scrollToHighlight(citation.highlightBox);
        } else if (citation.pageNumber) {
          // Fallback to page number if no highlight box
          console.log('Scrolling PDF to page:', citation.pageNumber);
          pdfViewerRef.current.scrollToHighlight({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            pageWidth: 0,
            pageHeight: 0,
            pageNumber: citation.pageNumber,
          });
        }
      } else if (!isPDF && docViewerRef.current) {
        // For text documents, try to scroll to citation
        if (citation.paragraphIndex) {
          console.log('Scrolling document to paragraph:', citation.paragraphIndex);
          docViewerRef.current.scrollToCitation({
            text: citation.snippet,
            paragraphIndex: citation.paragraphIndex,
            filePath: citation.filePath,
          });
        } else if (citation.snippet) {
          // Fallback: try to find snippet in content
          console.log('Scrolling document to snippet:', citation.snippet.substring(0, 50));
          docViewerRef.current.scrollToCitation({
            text: citation.snippet,
            filePath: citation.filePath,
          });
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [open, citation, uploadedFileBuffers]);

  if (!citation) return null;

  // Check if we have a file buffer for this citation
  const fileBuffer = citation.fileId && uploadedFileBuffers?.get(citation.fileId)?.buffer;
  const isPDF = citation.isPDF || 
                 citation.filePath?.toLowerCase().endsWith(".pdf") || 
                 (fileBuffer && citation.fileId?.includes('uploaded')) ||
                 (citation.fileId && uploadedFileBuffers?.has(citation.fileId));
  const fileName = citation.title || citation.filePath?.split(/[/\\]/).pop() || "Source";
  const fallbackHighlight =
    citation.highlightBox ||
    (citation.pageNumber
      ? {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          pageWidth: 0,
          pageHeight: 0,
          pageNumber: citation.pageNumber,
        }
      : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className={cn("p-0 flex flex-col")}
        style={{ width: `${drawerWidth}px`, maxWidth: "90vw" }}
        hideCloseButton
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 hover:bg-muted rounded-sm transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold truncate">{fileName}</SheetTitle>
              {citation.pageNumber && (
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Page {citation.pageNumber}
                </SheetDescription>
              )}
              {citation.paragraphIndex && !citation.pageNumber && (
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Paragraph {citation.paragraphIndex}
                </SheetDescription>
              )}
            </div>
          </div>

          {/* Resize handle */}
          <div
            ref={resizeHandleRef}
            className="w-6 h-full flex items-center justify-center cursor-ew-resize group"
            onMouseDown={startResizing}
            title="Drag to resize"
          >
            <div className="w-1 h-9 bg-border rounded-sm group-hover:bg-muted-foreground/50 transition-colors" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {isPDF && (citation.filePath || fileBuffer) ? (
            <PdfViewer
              ref={pdfViewerRef}
              filePath={citation.filePath}
              fileBuffer={fileBuffer}
              pageNumber={citation.pageNumber}
              highlight={fallbackHighlight}
              highlightText={citation.snippet}
            />
          ) : (
            <DocumentViewer
              ref={docViewerRef}
              filePath={citation.filePath}
              content={citation.fullContent || citation.snippet}
              citation={
                citation.paragraphIndex || citation.snippet
                  ? ({
                      text: citation.snippet,
                      paragraphIndex: citation.paragraphIndex,
                      filePath: citation.filePath,
                    } as DocCitation)
                  : null
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

