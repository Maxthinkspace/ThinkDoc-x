import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import thinkAIIcon from "@/assets/thinkspace-icon.png";

interface DraftVersionCardProps {
  versionNumber: number;
  timestamp?: string;
  preview?: string;
  onClick?: () => void;
  className?: string;
}

export default function DraftVersionCard({
  versionNumber,
  timestamp,
  preview,
  onClick,
  className,
}: DraftVersionCardProps) {
  const formatTimestamp = (ts?: string) => {
    if (!ts) return "Just now";
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Extract subject line or first line from preview
  const getPreviewText = () => {
    if (!preview) return "";
    const lines = preview.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return "";
    
    // Look for subject line
    const subjectMatch = preview.match(/Subject:\s*(.+)/i);
    if (subjectMatch) {
      return subjectMatch[1].trim();
    }
    
    // Otherwise return first meaningful line (up to 100 chars)
    const firstLine = lines[0].trim();
    return firstLine.length > 100 ? firstLine.substring(0, 100) + "..." : firstLine;
  };

  const previewText = getPreviewText();

  return (
    <Card
      className={cn(
        "p-4 bg-background border-border cursor-pointer hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <img src={thinkAIIcon} alt="Harvey" className="h-5 w-5 object-contain flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-foreground">Version {versionNumber}</span>
            {timestamp && (
              <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
            )}
          </div>
          {previewText && (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {previewText}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

