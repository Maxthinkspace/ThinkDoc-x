import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import thinkAIIcon from "@/assets/thinkspace-icon.png";

interface ThinkingIndicatorProps {
  message?: string;
  steps?: string[];
}

export default function ThinkingIndicator({ message = "Working...", steps = [] }: ThinkingIndicatorProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Default steps if none provided
  const defaultSteps = steps.length > 0 ? steps : [
    "Assessing query",
    "Searching uploaded documents for relevant information"
  ];

  return (
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 py-2 hover:opacity-80 transition-opacity">
          <img src={thinkAIIcon} alt="Think AI" className="h-5 w-5 object-contain" />
          <span className="text-sm text-muted-foreground">{message}</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-7">
          {defaultSteps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
              {idx === 0 ? (
                <span className="text-xs">•</span>
              ) : (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
              <span>{step}</span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
