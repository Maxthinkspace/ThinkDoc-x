import { Card } from "@/components/ui/card";
import { FileText, Globe, BookOpen } from "lucide-react";

interface Source {
  title: string;
  domain: string;
  icon?: string;
}

interface ReviewingStepProps {
  sources: Source[];
  count: number;
}

export default function ReviewingStep({ sources, count }: ReviewingStepProps) {
  const getIcon = (domain: string) => {
    if (domain.includes('gov')) return <span className="w-4 h-4 flex items-center justify-center text-xs">🏛️</span>;
    if (domain.includes('edu')) return <span className="w-4 h-4 flex items-center justify-center text-xs">🎓</span>;
    return <Globe className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">
        Reviewing sources · {count}
      </div>
      <div className="space-y-1.5">
        {sources.map((source, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            {getIcon(source.domain)}
            <div className="flex-1 min-w-0">
              <div className="truncate text-foreground font-medium">{source.title}</div>
              <div className="text-xs text-muted-foreground">{source.domain}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
