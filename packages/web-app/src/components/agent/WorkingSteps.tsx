import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkingStep {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "working" | "complete";
}

interface WorkingStepsProps {
  steps: WorkingStep[];
  className?: string;
}

export default function WorkingSteps({ steps, className }: WorkingStepsProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const hasWorkingSteps = steps.some((s) => s.status === "working");
  const completedCount = steps.filter((s) => s.status === "complete").length;

  if (steps.length === 0) return null;

  return (
    <Card className={cn("p-4 bg-muted/30 border-border/50", className)}>
      <div className="space-y-3">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">H</span>
            </div>
            <span className="font-medium text-foreground">
              {hasWorkingSteps ? "Working..." : `Finished in ${steps.length} steps`}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Steps */}
        {expanded && (
          <div className="space-y-2 pl-8">
            {steps.map((step) => {
              const isExpanded = expandedSteps.has(step.id);
              const isComplete = step.status === "complete";
              const isWorking = step.status === "working";

              return (
                <div key={step.id} className="space-y-1">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : isWorking ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-sm flex-1",
                        isComplete && "text-foreground",
                        isWorking && "text-foreground font-medium",
                        !isComplete && !isWorking && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    {step.description && (
                      <span className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </button>
                  {step.description && isExpanded && (
                    <p className="text-sm text-muted-foreground pl-6 leading-relaxed">
                      {step.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

