import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Upload, Languages, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
];

const exportFormats = [
  { value: "pdf", label: "PDF Document" },
  { value: "docx", label: "Word Document" },
  { value: "txt", label: "Text File" },
];

type Step = "upload" | "configure" | "processing" | "complete";

const steps: { id: Step; label: string; icon: typeof Upload }[] = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "configure", label: "Configure", icon: Languages },
  { id: "processing", label: "Processing", icon: FileText },
  { id: "complete", label: "Complete", icon: Check },
];

export default function TranslateWorkflowPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [insertionMode, setInsertionMode] = useState("below");
  const [exportFormat, setExportFormat] = useState("pdf");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setCurrentStep("configure");
      toast({
        title: "File uploaded",
        description: `${file.name} is ready for translation`,
      });
    }
  };

  const handleStartTranslation = async () => {
    if (!sourceLanguage || !targetLanguage) {
      toast({
        title: "Missing information",
        description: "Please select both source and target languages",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep("processing");

    // Simulate translation processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setCurrentStep("complete");
    toast({
      title: "Translation complete",
      description: "Your document has been translated successfully",
    });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: `Downloading translated document as ${exportFormats.find(f => f.value === exportFormat)?.label}`,
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
              <p className="text-muted-foreground">Upload a document to begin translation</p>
            </div>
            
            <label htmlFor="translate-file-upload" className="cursor-pointer block">
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
                id="translate-file-upload"
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
              <Languages className="h-6 w-6 text-primary mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold">Translation Configuration</h2>
                <p className="text-muted-foreground">Configure your translation settings</p>
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

            {/* Language Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source Language</Label>
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Language</Label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Translation Insertion */}
            <div className="space-y-3">
              <Label>Translation Insertion</Label>
              <RadioGroup value={insertionMode} onValueChange={setInsertionMode}>
                <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="above" id="above" className="mt-1" />
                    <label htmlFor="above" className="cursor-pointer flex-1">
                      <p className="font-medium">Insert above each paragraph</p>
                      <p className="text-sm text-muted-foreground">Translation appears before original text</p>
                    </label>
                  </div>
                </Card>

                <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="below" id="below" className="mt-1" />
                    <label htmlFor="below" className="cursor-pointer flex-1">
                      <p className="font-medium">Insert below each paragraph</p>
                      <p className="text-sm text-muted-foreground">Translation appears after original text</p>
                    </label>
                  </div>
                </Card>

                <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="replace" id="replace" className="mt-1" />
                    <label htmlFor="replace" className="cursor-pointer flex-1">
                      <p className="font-medium">Replace original text</p>
                      <p className="text-sm text-muted-foreground">Only show translated text</p>
                    </label>
                  </div>
                </Card>
              </RadioGroup>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleStartTranslation}
                disabled={!sourceLanguage || !targetLanguage}
              >
                Start Translation
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
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Processing Translation</h2>
              <p className="text-muted-foreground">
                Translating your document from {languages.find(l => l.code === sourceLanguage)?.name} to {languages.find(l => l.code === targetLanguage)?.name}...
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
              <h2 className="text-2xl font-bold mb-2">Translation Complete</h2>
              <p className="text-muted-foreground">
                Your document has been successfully translated and is ready for download
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Close
              </Button>
              <Button onClick={handleDownload}>
                Download Translated Document
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
