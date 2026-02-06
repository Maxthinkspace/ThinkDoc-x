import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import SourcePreview from "./SourcePreview";

interface ResearchStepProps {
  step: {
    step: number;
    title: string;
    content: string;
    sources?: { url: string; title: string; snippet: string }[];
    status: 'thinking' | 'complete';
  };
}

export default function ResearchStep({ step }: ResearchStepProps) {
  return (
    <Card className="p-6 space-y-4 bg-card border-border">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {step.status === 'thinking' ? (
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-success" />
          )}
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Step {step.step}
            </Badge>
            <h3 className="font-semibold text-foreground">{step.title}</h3>
          </div>

          <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {step.content}
          </p>

          {step.sources && step.sources.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="font-medium">Sources</span>
              </div>
              <ol className="space-y-1">
                {step.sources.map((source, idx) => (
                  <li key={idx} className="">
                    <details className="group">
                      <summary className="flex items-center gap-2 cursor-pointer text-sm text-foreground/90 hover:text-accent transition-colors">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-semibold">
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-[80%]">{source.title || source.url}</span>
                      </summary>
                      <div className="mt-2 ml-7">
                        {source.snippet && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-3">{source.snippet}</p>
                        )}
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline hover:no-underline"
                        >
                          Open link
                        </a>
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
