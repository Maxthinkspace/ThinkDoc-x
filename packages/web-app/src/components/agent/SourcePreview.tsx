import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface SourcePreviewProps {
  source: {
    url: string;
    title: string;
    snippet: string;
  };
}

export default function SourcePreview({ source }: SourcePreviewProps) {
  const displayTitle = source.title || source.url;
  const displayUrl = source.url.length > 50 ? source.url.substring(0, 50) + '...' : source.url;

  return (
    <a 
      href={source.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block group"
    >
      <Card className="p-3 hover:bg-accent/5 transition-colors border-border/50">
        <div className="flex items-start gap-2">
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
              {displayTitle}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {displayUrl}
            </p>
            {source.snippet && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {source.snippet}
              </p>
            )}
          </div>
        </div>
      </Card>
    </a>
  );
}
