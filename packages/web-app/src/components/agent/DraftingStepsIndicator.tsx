import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import thinkAIIcon from "@/assets/thinkspace-icon.png";

export interface DraftingStep {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "working" | "complete";
}

interface DraftingStepsIndicatorProps {
  steps: DraftingStep[];
  className?: string;
}

export default function DraftingStepsIndicator({ steps, className }: DraftingStepsIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
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
          className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <img src={thinkAIIcon} alt="Harvey" className="h-4 w-4 object-contain" />
            <span className="font-medium text-foreground text-sm">
              {hasWorkingSteps ? "Working..." : `Finished in ${steps.length} step${steps.length !== 1 ? "s" : ""}`}
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
          <div className="space-y-2 pl-6">
            {steps.map((step) => {
              const isExpanded = expandedSteps.has(step.id);
              const isComplete = step.status === "complete";
              const isWorking = step.status === "working";

              return (
                <div key={step.id} className="space-y-1">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
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

