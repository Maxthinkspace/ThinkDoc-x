import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
  Eye,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  type: "critical" | "important" | "minor";
  title: string;
  description: string;
  location: string;
}

interface Redline {
  type: "addition" | "deletion" | "modification";
  original: string;
  suggested: string;
  reason: string;
}

interface ReviewOutputProps {
  suggestions: Suggestion[];
  redlines: Redline[];
  documentContent: string;
}

export default function ReviewOutput({ suggestions, redlines, documentContent }: ReviewOutputProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("summary");

  const handleOpenThinkDoc = () => {
    toast({
      title: "Opening in ThinkDoc",
      description: "Document will open in Microsoft Word with ThinkDoc add-in for editing",
    });
    // In production, this would trigger Word add-in with document
  };

  const handleDownload = () => {
    const blob = new Blob([documentContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reviewed-document.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Document with redlines has been downloaded",
    });
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "important":
        return <Info className="h-4 w-4 text-warning" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
    }
  };

  const getSuggestionBadge = (type: string) => {
    switch (type) {
      case "critical":
        return <Badge variant="destructive" className="text-xs">Critical</Badge>;
      case "important":
        return <Badge variant="outline" className="text-xs border-warning text-warning">Important</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Minor</Badge>;
    }
  };

  return (
    <Card className="mt-4">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Contract Review Complete</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button size="sm" onClick={handleOpenThinkDoc}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in ThinkDoc
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border px-4">
          <TabsList className="bg-transparent">
            <TabsTrigger value="summary" className="gap-2">
              <Info className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="redlines" className="gap-2">
              <Eye className="h-4 w-4" />
              Redlines
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="p-0 mt-0">
          <ScrollArea className="h-[500px]">
            <div className="p-4">
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-semibold">Key Findings</h3>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Total Issues:</span>
                    <span className="font-semibold">{suggestions.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Critical:</span>
                    <span className="font-semibold text-destructive">
                      {suggestions.filter(s => s.type === "critical").length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Important:</span>
                    <span className="font-semibold text-warning">
                      {suggestions.filter(s => s.type === "important").length}
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getSuggestionIcon(suggestion.type)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold leading-tight">
                            {index + 1}. {suggestion.title}
                          </h4>
                          {getSuggestionBadge(suggestion.type)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <ChevronRight className="h-3 w-3" />
                          <span>{suggestion.location}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="redlines" className="p-0 mt-0">
          <ScrollArea className="h-[500px]">
            <div className="p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Tracked Changes</h3>
                <p className="text-xs text-muted-foreground">
                  Review the proposed changes below. Open in ThinkDoc to accept or reject individual changes.
                </p>
              </div>
              
              <div className="space-y-3">
                {redlines.map((redline, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <Badge 
                        variant={
                          redline.type === "addition" ? "default" : 
                          redline.type === "deletion" ? "destructive" : 
                          "secondary"
                        } 
                        className="text-xs mt-0.5"
                      >
                        {redline.type}
                      </Badge>
                      <div className="flex-1 space-y-2">
                        {redline.original && (
                          <div className="text-sm text-destructive line-through bg-destructive/5 p-2 rounded">
                            {redline.original}
                          </div>
                        )}
                        <div className="text-sm text-primary font-medium bg-primary/5 p-2 rounded">
                          {redline.suggested}
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          {redline.reason}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
