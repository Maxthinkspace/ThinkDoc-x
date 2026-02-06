import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
import { type SourceCitation } from "./SourceDrawer";

interface CitationPreviewProps {
  citation: SourceCitation;
  children: React.ReactNode;
  onOpenFullView?: (citation: SourceCitation) => void;
}

export default function CitationPreview({
  citation,
  children,
  onOpenFullView,
}: CitationPreviewProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
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
            {citation.title || citation.filePath || "Source"}
          </span>
        </div>

        {/* Source snippet with highlight */}
        <div className="p-3 max-h-48 overflow-y-auto">
          <div className="relative">
            {/* Highlight bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60 rounded-full" />
            
            {/* Quote content */}
            <div className="pl-3">
              {citation.snippet && (
                <p className="text-sm text-foreground leading-relaxed italic">
                  "{citation.snippet}"
                </p>
              )}
              {citation.fullContent && !citation.snippet && (
                <p className="text-sm text-foreground leading-relaxed italic">
                  "{citation.fullContent.substring(0, 200)}..."
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with View in Document button */}
        <div className="px-3 py-2 bg-muted/30 border-t flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {citation.pageNumber ? `Page ${citation.pageNumber}` : "Extracted from document"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenFullView?.(citation);
            }}
            className="h-6 text-xs gap-1.5"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View in Document
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

