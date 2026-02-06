import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface ProgressStepProps {
  status: string;
  timeRemaining?: string;
  description?: string;
}

export default function ProgressStep({ status, timeRemaining, description }: ProgressStepProps) {
  return (
    <Card className="p-4 bg-muted/30 border-border/50">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {status}
            {timeRemaining && (
              <span className="text-muted-foreground"> · {timeRemaining}</span>
            )}
          </span>
        </div>
        {description && (
          <p className="text-sm text-foreground/80 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </Card>
  );
}
