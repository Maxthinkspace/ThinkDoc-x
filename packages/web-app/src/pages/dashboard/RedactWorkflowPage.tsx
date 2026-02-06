import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, ShieldCheck, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface RedactionType {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

type Step = "upload" | "configure" | "processing" | "complete";

const steps: { id: Step; label: string; icon: typeof Upload }[] = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "configure", label: "Configure", icon: ShieldCheck },
  { id: "processing", label: "Processing", icon: FileText },
  { id: "complete", label: "Complete", icon: Check },
];

export default function RedactWorkflowPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [redactedText, setRedactedText] = useState("");
  const [redactionTypes, setRedactionTypes] = useState<RedactionType[]>([
    { id: "pii", label: "Personal Information", description: "Names, addresses, phone numbers", checked: true },
    { id: "ssn", label: "Social Security Numbers", description: "SSN and tax IDs", checked: true },
    { id: "financial", label: "Financial Information", description: "Credit card numbers, bank accounts", checked: true },
    { id: "medical", label: "Medical Information", description: "Medical records, health data", checked: true },
    { id: "legal", label: "Legal Identifiers", description: "Case numbers, docket numbers", checked: false },
    { id: "custom", label: "Custom Patterns", description: "User-defined sensitive data", checked: false },
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalText(e.target?.result as string);
      };
      reader.readAsText(file);
      setCurrentStep("configure");
      
      toast({
        title: "File uploaded",
        description: `${file.name} is ready for redaction`,
      });
    }
  };

  const toggleRedactionType = (id: string) => {
    setRedactionTypes(types =>
      types.map(type =>
        type.id === id ? { ...type, checked: !type.checked } : type
      )
    );
  };

  const handleStartRedaction = async () => {
    if (!originalText || !redactionTypes.some(t => t.checked)) {
      toast({
        title: "Missing information",
        description: "Please upload a document and select at least one redaction type",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep("processing");

    // Simulate redaction processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Perform redaction
    let redacted = originalText;
    
    if (redactionTypes.find(t => t.id === "pii")?.checked) {
      redacted = redacted.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[REDACTED NAME]");
      redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[REDACTED PHONE]");
    }
    
    if (redactionTypes.find(t => t.id === "ssn")?.checked) {
      redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED SSN]");
    }
    
    if (redactionTypes.find(t => t.id === "financial")?.checked) {
      redacted = redacted.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[REDACTED CREDIT CARD]");
    }
    
    setRedactedText(redacted);
    setCurrentStep("complete");
    
    toast({
      title: "Redaction complete",
      description: "Sensitive information has been identified and redacted",
    });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleDownload = () => {
    const blob = new Blob([redactedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redacted-${uploadedFile?.name || 'document.txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Redacted document has been downloaded",
    });
  };

  const getStepIndex = (step: Step) => steps.findIndex(s => s.id === step);
  const currentStepIndex = getStepIndex(currentStep);

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center flex-1 relative">
              {index > 0 && (
                <div className="absolute top-6 right-1/2 w-full h-0.5 -z-10 bg-border">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300",
                      isCompleted ? "bg-primary" : "bg-transparent"
                    )}
                  />
                </div>
              )}
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary text-primary-foreground",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                <StepIcon className="h-5 w-5" />
              </div>
              <span className={cn(
                "mt-2 text-sm font-medium",
                isActive && "text-foreground",
                !isActive && "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Upload Step */}
      {currentStep === "upload" && (
        <Card className="p-8">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Upload Document</h2>
              <p className="text-muted-foreground">Upload a document to begin redaction</p>
            </div>
            
            <label htmlFor="redact-file-upload" className="cursor-pointer block">
              <Card className="p-12 border-dashed border-2 hover:border-primary/50 transition-colors">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-lg font-medium">Click to upload</p>
                    <p className="text-sm text-muted-foreground">PDF, DOCX, or TXT files supported</p>
                  </div>
                </div>
              </Card>
              <input
                id="redact-file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </Card>
      )}

      {/* Configure Step */}
      {currentStep === "configure" && (
        <Card className="p-8">
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-primary mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold">Redaction Configuration</h2>
                <p className="text-muted-foreground">Select the types of information to redact</p>
              </div>
            </div>

            {/* Uploaded File Info */}
            {uploadedFile && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Redaction Types */}
            <div className="space-y-3">
              <Label>Redaction Types</Label>
              <div className="space-y-3">
                {redactionTypes.map((type) => (
                  <Card 
                    key={type.id} 
                    className={cn(
                      "p-4 cursor-pointer hover:bg-accent/50 transition-colors",
                      type.checked && "bg-accent/30 border-primary"
                    )}
                    onClick={() => toggleRedactionType(type.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={type.checked}
                        onCheckedChange={() => toggleRedactionType(type.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleStartRedaction}
                disabled={!redactionTypes.some(t => t.checked)}
              >
                Start Redaction
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Processing Step */}
      {currentStep === "processing" && (
        <Card className="p-8">
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Processing Redaction</h2>
              <p className="text-muted-foreground">
                Identifying and redacting sensitive information from your document...
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Complete Step */}
      {currentStep === "complete" && (
        <Card className="p-8">
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Redaction Complete</h2>
              <p className="text-muted-foreground">
                Sensitive information has been successfully redacted and your document is ready
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Close
              </Button>
              <Button onClick={handleDownload}>
                Download Redacted Document
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
