import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Flag, ThumbsUp, ThumbsDown, FileText, X } from "lucide-react";
import PdfViewer from "@/components/agent/PdfViewer";
import DocumentViewer from "@/components/agent/DocumentViewer";
import { CellData } from "./CitationCell";
import { VaultFile } from "@/services/vaultApi";

interface VerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: VaultFile | null;
  cellData: CellData | undefined;
  onVerify: (verified: boolean) => void;
  onFlag: () => void;
  onRate: (rating: 'up' | 'down') => void;
  assignedTo?: string;
  onAssign?: (userId: string) => void;
}

export const VerificationModal = ({
  open,
  onOpenChange,
  file,
  cellData,
  onVerify,
  onFlag,
  onRate,
  assignedTo,
  onAssign,
}: VerificationModalProps) => {
  const [isVerified, setIsVerified] = useState(cellData?.verified || false);
  const [isFlagged, setIsFlagged] = useState(cellData?.flagged || false);

  const handleVerify = () => {
    setIsVerified(true);
    onVerify(true);
  };

  const handleFlag = () => {
    setIsFlagged(!isFlagged);
    onFlag();
  };

  if (!file || !cellData) return null;

  const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-destructive" />
            Verification - {file.name}
          </DialogTitle>
          <DialogDescription>
            Review and verify the extracted information
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel - Document Viewer */}
          <div className="flex-1 overflow-hidden border-r">
            {isPdf ? (
              <div className="h-full w-full">
                {/* PDF Viewer will be rendered here */}
                <div className="h-full flex items-center justify-center bg-muted/20">
                  <p className="text-muted-foreground">PDF viewer will load here</p>
                </div>
              </div>
            ) : (
              <DocumentViewer
                content={cellData.sourceSnippet || ""}
                citation={{ text: cellData.sourceSnippet || "", filePath: file.name }}
              />
            )}
          </div>

          {/* Right Panel - Verification Controls */}
          <div className="w-96 flex flex-col border-l bg-muted/30">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Summary</Label>
                <p className="text-sm text-foreground leading-relaxed">
                  {cellData.value}
                </p>
              </div>

              {/* Additional Context */}
              {cellData.sourceSnippet && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Additional context</Label>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cellData.sourceSnippet}
                  </p>
                </div>
              )}

              {/* Source */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Source</Label>
                <a
                  href="#"
                  className="text-sm text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    // Navigate to source page
                  }}
                >
                  {file.name}
                </a>
                {cellData.highlightBox?.pageNumber && (
                  <span className="text-sm text-muted-foreground ml-2">
                    Pages {cellData.highlightBox.pageNumber}
                  </span>
                )}
              </div>

              {/* Assigned To */}
              {assignedTo && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Assigned to</Label>
                  <p className="text-sm text-muted-foreground">{assignedTo}</p>
                </div>
              )}

              {/* Verification */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Verification</Label>
                {isVerified ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerify}
                    className="w-full"
                  >
                    Click to verify response
                  </Button>
                )}
              </div>

              {/* Flagging */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Flagging</Label>
                <Button
                  variant={isFlagged ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleFlag}
                  className="w-full"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  {isFlagged ? "Flagged" : "Flag"}
                </Button>
              </div>

              {/* Rating */}
              <div>
                <Label className="text-sm font-medium mb-2 block">How would you rate this response?</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRate('up')}
                    className="flex-1"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRate('down')}
                    className="flex-1"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationModal;


