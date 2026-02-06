import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table2, MessageSquare, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueryTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFilesCount: number;
  onSelectType: (type: "review" | "ask") => void;
}

const QueryTypeDialog = ({ 
  open, 
  onOpenChange, 
  selectedFilesCount,
  onSelectType 
}: QueryTypeDialogProps) => {
  const [selectedType, setSelectedType] = useState<"review" | "ask">("review");

  const handleContinue = () => {
    onSelectType(selectedType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Choose query type</DialogTitle>
          <DialogDescription>
            {selectedFilesCount > 0 
              ? `${selectedFilesCount} file${selectedFilesCount > 1 ? 's' : ''} selected`
              : 'All files selected'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            {/* Review Query Option */}
            <button
              onClick={() => setSelectedType("review")}
              className={cn(
                "w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left",
                selectedType === "review" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-foreground/30"
              )}
            >
              {/* Table illustration */}
              <div className="flex-shrink-0 w-28 h-20 bg-muted/50 rounded-lg p-3 flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <div className="h-2 w-6 bg-muted-foreground/20 rounded" />
                  <div className="h-2 w-6 bg-muted-foreground/20 rounded" />
                  <div className="h-2 w-6 bg-muted-foreground/20 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-2 w-8 bg-muted-foreground/30 rounded" />
                  <div className="h-2 w-8 bg-muted-foreground/30 rounded" />
                  <div className="h-2 w-8 bg-muted-foreground/30 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-1.5 w-3 bg-muted-foreground/20 rounded" />
                  <div className="h-1.5 w-3 bg-muted-foreground/20 rounded" />
                  <div className="h-1.5 w-3 bg-muted-foreground/20 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-2 w-8 bg-muted-foreground/30 rounded" />
                  <div className="h-2 w-8 bg-muted-foreground/30 rounded" />
                  <div className="h-2 w-8 bg-muted-foreground/30 rounded" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1">Review query</h4>
                <p className="text-sm text-muted-foreground">
                  Get individual answers for each file in a table.
                </p>
              </div>
              
              {selectedType === "review" && (
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              )}
            </button>

            {/* Ask Query Option */}
            <button
              onClick={() => setSelectedType("ask")}
              className={cn(
                "w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left",
                selectedType === "ask" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-foreground/30"
              )}
            >
              {/* Text illustration */}
              <div className="flex-shrink-0 w-28 h-20 bg-muted/50 rounded-lg p-3 flex flex-col gap-1.5">
                <div className="h-2.5 w-full bg-muted-foreground/30 rounded" />
                <div className="h-2.5 w-[90%] bg-muted-foreground/20 rounded" />
                <div className="h-2.5 w-[95%] bg-muted-foreground/25 rounded" />
                <div className="h-2.5 w-[75%] bg-muted-foreground/20 rounded" />
                <div className="h-2.5 w-[60%] bg-muted-foreground/15 rounded" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1">Ask query</h4>
                <p className="text-sm text-muted-foreground">
                  Get a single answer on collective information across all files.
                </p>
              </div>
              
              {selectedType === "ask" && (
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QueryTypeDialog;