import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditableOutputProps {
  initialContent: string;
}

export default function EditableOutput({ initialContent }: EditableOutputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Saved",
      description: "Your changes have been saved.",
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied",
      description: "Content copied to clipboard.",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `associate-output-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "File downloaded successfully.",
    });
  };

  return (
    <Card className="p-6 space-y-4 bg-accent/5 border-accent/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-accent text-accent-foreground">
            Editable Output
          </Badge>
          <span className="text-sm text-muted-foreground">
            Contract / Summary / Report
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>

          {isEditing ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[400px] font-mono text-sm"
        />
      ) : (
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-foreground bg-background/50 p-4 rounded-md border border-border">
            {content}
          </pre>
        </div>
      )}
    </Card>
  );
}
