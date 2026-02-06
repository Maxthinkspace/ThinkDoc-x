import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface SourceFile {
  id: string;
  name: string;
  pageCount: number;
  citedPages?: number[]; // Pages that have citations
}

interface SourcesPanelProps {
  sources: SourceFile[];
  onPageClick?: (sourceId: string, pageNumber: number) => void;
  className?: string;
}

export default function SourcesPanel({
  sources,
  onPageClick,
  className,
}: SourcesPanelProps) {
  if (sources.length === 0) {
    return (
      <div className={cn("p-4 text-sm text-muted-foreground", className)}>
        No sources available
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Sources</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {sources.map((source) => (
            <div key={source.id} className="space-y-2">
              <div className="text-sm font-medium text-foreground truncate">
                {source.name}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: source.pageCount }, (_, i) => {
                  const pageNumber = i + 1;
                  const isCited = source.citedPages?.includes(pageNumber);
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => onPageClick?.(source.id, pageNumber)}
                      className={cn(
                        "h-6 min-w-[28px] px-2 text-xs rounded-md transition-colors",
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
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

