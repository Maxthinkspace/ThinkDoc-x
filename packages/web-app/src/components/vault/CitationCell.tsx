import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CellData {
  value: string;
  confidence?: "high" | "medium" | "low";
  sourceSnippet?: string;
  // For PDF highlighting - optional positioning info
  highlightBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageWidth: number;
    pageHeight: number;
    pageNumber?: number;
  };
  pageNumber?: number;
  sourceLocation?: string;
}

interface CitationCellProps {
  data: CellData | string | undefined;
  fileName?: string;
  fileId?: string;
  citationNumber?: number; // Number assigned to this citation
  onViewSource?: (fileId: string, sourceSnippet: string, highlightBox?: CellData["highlightBox"]) => void;
}

const confidenceColors = {
  high: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  low: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

const CitationCell = ({ data, fileName, fileId, citationNumber, onViewSource }: CitationCellProps) => {
  // Handle string or undefined data (backwards compatibility)
  if (!data) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (typeof data === "string") {
    return <span className="text-sm">{data}</span>;
  }

  const { value, confidence, sourceSnippet, highlightBox, pageNumber } = data;

  // If no source snippet, just show the value
  if (!sourceSnippet) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{value || "—"}</span>
        {confidence && (
          <span
            className={cn(
              "px-1.5 py-0.5 text-[10px] font-medium rounded border",
              confidenceColors[confidence]
            )}
          >
            {confidence}
          </span>
        )}
      </div>
    );
  }

  const handleViewInDocument = () => {
    if (fileId && onViewSource) {
      onViewSource(fileId, sourceSnippet, highlightBox);
    }
  };

  // Show value with citation reference that has hover popup
  return (
    <div className="flex items-start gap-1">
      <span className="text-sm flex-1">{value || "—"}</span>
      {sourceSnippet && citationNumber !== undefined && (
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded",
                "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
                "cursor-pointer border border-primary/20 text-[10px] font-semibold"
              )}
              title="View source"
            >
              {citationNumber}
            </button>
          </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="start"
          className="w-96 p-0 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground truncate">
              {fileName || "Source Document"}
            </span>
            {confidence && (
              <span
                className={cn(
                  "ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded border",
                  confidenceColors[confidence]
                )}
              >
                {confidence}
              </span>
            )}
          </div>

          {/* Source snippet with highlight */}
          <div className="p-3 max-h-48 overflow-y-auto">
            <div className="relative">
              {/* Highlight bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60 rounded-full" />
              
              {/* Quote content */}
              <div className="pl-3">
                <p className="text-sm text-foreground leading-relaxed italic">
                  "{sourceSnippet}"
                </p>
              </div>
            </div>
          </div>

          {/* Footer with View in Document button */}
          <div className="px-3 py-2 bg-muted/30 border-t flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              Extracted from document
            </p>
            {fileId && onViewSource && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={handleViewInDocument}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View in Document
              </Button>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
      )}
    </div>
  );
};

export default CitationCell;

