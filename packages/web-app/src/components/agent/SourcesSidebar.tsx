import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { X, FileText, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { type SourceCitation } from "./SourceDrawer";

interface Source {
  id: string;
  name: string;
  type: "document" | "vault" | "web" | "playbook";
  pageCount?: number;
  citedPages?: number[];
  url?: string;
}

interface SourcesSidebarProps {
  sources: Source[];
  citations?: Map<number, SourceCitation>;
  onPageClick?: (sourceId: string, pageNumber: number) => void;
  onClose?: () => void;
  className?: string;
}

export default function SourcesSidebar({
  sources,
  citations,
  onPageClick,
  onClose,
  className,
}: SourcesSidebarProps) {
  const getSourceIcon = (type: string) => {
    switch (type) {
      case "web":
        return <Globe className="h-4 w-4 text-muted-foreground" />;
      case "document":
      case "vault":
      case "playbook":
      default:
        return <FileText className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background border-l border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Sources</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-sm transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-border">
        <div className="relative">
          <Input
            placeholder="Q Search sources"
            className="h-8 text-sm pl-8"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Q
          </span>
        </div>
      </div>

      {/* Sources List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {sources.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No sources available
            </div>
          ) : (
            sources.map((source) => {
              // Find citations for this source
              const sourceCitations = citations ? Array.from(citations.values()).filter(cit => {
                const citSourceId = cit.fileId || cit.filePath || cit.url || cit.title;
                return citSourceId === source.id || cit.fileId === source.id;
              }) : [];
              
              return (
                <div key={source.id} className="space-y-2">
                  <button
                    onClick={() => {
                      // Click on source name to open first citation
                      if (sourceCitations.length > 0 && onPageClick) {
                        const firstCitation = sourceCitations[0];
                        const sourceId = firstCitation.fileId || firstCitation.filePath || firstCitation.url || source.id;
                        const pageNumber = firstCitation.pageNumber || 1;
                        onPageClick(sourceId, pageNumber);
                      }
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full text-left"
                  >
                    {getSourceIcon(source.type)}
                    <span className="truncate">{source.name}</span>
                  </button>
                  {source.pageCount && source.pageCount > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: source.pageCount }, (_, i) => {
                        const pageNumber = i + 1;
                        const isCited = source.citedPages?.includes(pageNumber);
                        // Find citation for this specific page
                        const pageCitation = sourceCitations.find(cit => cit.pageNumber === pageNumber);
                        
                        return (
                          <button
                            key={pageNumber}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (onPageClick) {
                                const sourceId = pageCitation?.fileId || pageCitation?.filePath || source.id;
                                onPageClick(sourceId, pageNumber);
                              }
                            }}
                            className={cn(
                              "h-6 min-w-[28px] px-2 text-xs rounded-md transition-colors cursor-pointer",
                              "hover:bg-primary/10 hover:text-primary",
                              isCited
                                ? "bg-primary/10 text-primary font-medium"
                                : "bg-muted/50 text-muted-foreground"
                            )}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

