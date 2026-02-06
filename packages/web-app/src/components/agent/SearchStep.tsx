import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";

interface SearchStepProps {
  queries: string[];
}

export default function SearchStep({ queries }: SearchStepProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">Searching</div>
      <div className="space-y-1">
        {queries.map((query, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-foreground/80">
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <code className="bg-muted/50 px-2 py-0.5 rounded text-xs font-mono">
              {query}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}
