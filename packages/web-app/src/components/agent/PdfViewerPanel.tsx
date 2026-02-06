import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import PdfViewer from "./PdfViewer";
import { cn } from "@/lib/utils";

interface PdfViewerPanelProps {
  sourceId: string;
  initialPage?: number;
  pageCount?: number;
  fileBuffer?: ArrayBuffer;
  filePath?: string;
  onClose?: () => void;
  className?: string;
}

export default function PdfViewerPanel({
  sourceId,
  initialPage = 1,
  pageCount = 40, // Default, should be fetched from source
  fileBuffer,
  filePath,
  onClose,
  className,
}: PdfViewerPanelProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.2);

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Page Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Page</span>
          <div className="flex items-center gap-1 flex-wrap max-w-md">
            {Array.from({ length: Math.min(pageCount, 50) }, (_, i) => {
              const pageNumber = i + 1;
              const isActive = pageNumber === currentPage;
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageClick(pageNumber)}
                  className={cn(
                    "h-7 min-w-[32px] px-2 text-xs rounded-md transition-colors",
                    isActive
                      ? "bg-foreground text-background font-medium"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}
            {pageCount > 50 && (
              <span className="text-xs text-muted-foreground">...</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <PdfViewer
            fileBuffer={fileBuffer}
            filePath={filePath}
            pageNumber={currentPage}
            scale={scale}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

