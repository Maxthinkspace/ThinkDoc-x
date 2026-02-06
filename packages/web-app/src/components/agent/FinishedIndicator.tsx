import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FinishedIndicatorProps {
  sourceCount: number;
}

export default function FinishedIndicator({ sourceCount }: FinishedIndicatorProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span className="text-sm font-medium text-success">Finished</span>
      </div>
      <Badge variant="outline" className="gap-1.5">
        <span className="text-xs">🔗</span>
        <span className="text-xs font-medium">{sourceCount} sources</span>
      </Badge>
    </div>
  );
}
