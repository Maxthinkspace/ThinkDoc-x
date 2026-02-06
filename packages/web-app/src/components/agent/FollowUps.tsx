import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface FollowUpsProps {
  suggestions: string[];
  onSelect?: (suggestion: string) => void;
}

export default function FollowUps({ suggestions, onSelect }: FollowUpsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Follow-ups</h3>
        <div className="space-y-2">
          {suggestions.map((suggestion, idx) => (
            <Button
              key={idx}
              variant="ghost"
              className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-muted/50"
              onClick={() => onSelect?.(suggestion)}
            >
              <span className="flex-1 text-sm text-foreground">{suggestion}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-2" />
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}

