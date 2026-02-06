import { Button } from "@/components/ui/button";
import { FileText, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface DraftActionsBarProps {
  documentContent?: string;
  documentId?: string;
  className?: string;
}

export default function DraftActionsBar({
  documentContent,
  documentId,
  className,
}: DraftActionsBarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleOpenInThinkDoc = () => {
    // In production, this would trigger Word add-in with document
    // For now, show a toast and potentially navigate to Word add-in page
    toast({
      title: "Opening in ThinkDoc",
      description: "Document will open in Microsoft Word with ThinkDoc add-in for editing",
    });
    
    // Optionally navigate to Word add-in page or trigger protocol handler
    // window.location.href = "thinkdoc://open-document?id=" + documentId;
    
    // For now, navigate to Word add-in info page
    navigate("/word-addin");
  };

  const handleUsePlaybookReview = () => {
    // Navigate to playbook review page with document content
    toast({
      title: "Opening Playbook Review",
      description: "Preparing document for playbook review",
    });
    
    // Navigate to vault MA review page (or appropriate playbook review route)
    // Pass document content via state or save to backend first
    navigate("/dashboard/vault/ma-review", {
      state: {
        documentContent,
        documentId,
      },
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenInThinkDoc}
        className="h-8 text-sm"
      >
        <FileText className="h-3.5 w-3.5 mr-1.5" />
        Open in ThinkDoc
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUsePlaybookReview}
        className="h-8 text-sm"
      >
        <BookOpen className="h-3.5 w-3.5 mr-1.5" />
        Use Playbook Review
      </Button>
    </div>
  );
}

