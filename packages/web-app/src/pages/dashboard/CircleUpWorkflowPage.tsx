import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Check, Circle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Step = "upload" | "configure" | "processing" | "complete";

const CircleUpWorkflowPage = () => {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [highlightType, setHighlightType] = useState<string>("circle");
  const [numberType, setNumberType] = useState<string>("all");
  const [colorChoice, setColorChoice] = useState<string>("red");

  const steps: { id: Step; label: string; icon: typeof Upload }[] = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "configure", label: "Configure", icon: Circle },
    { id: "processing", label: "Processing", icon: FileText },
    { id: "complete", label: "Complete", icon: Check },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleNext = () => {
    if (currentStep === "upload" && file) {
      setCurrentStep("configure");
    } else if (currentStep === "configure") {
      setCurrentStep("processing");
      setTimeout(() => setCurrentStep("complete"), 2000);
    }
  };

  const handleStartNew = () => {
    setCurrentStep("upload");
    setFile(null);
    setHighlightType("circle");
    setNumberType("all");
    setColorChoice("red");
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-light text-foreground">Circle Up</h1>
        <p className="text-muted-foreground">Intelligently circle and highlight numbers in PDF documents</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-smooth ${
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : steps.findIndex((s) => s.id === currentStep) > index
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <step.icon className="h-6 w-6" />
              </div>
              <span className="text-sm mt-2 text-muted-foreground">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 ${
                  steps.findIndex((s) => s.id === currentStep) > index ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-8">
          {currentStep === "upload" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-light text-foreground mb-4">Upload Document</h2>
                <p className="text-muted-foreground mb-6">Select a PDF document to process</p>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-smooth">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {file ? file.name : "Click to upload or drag and drop"}
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Select PDF
                  </label>
                </Button>
              </div>

              <Button onClick={handleNext} disabled={!file} className="w-full">
                Continue to Configuration
              </Button>
            </div>
          )}

          {currentStep === "configure" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-light text-foreground mb-4">Configure Highlighting</h2>
                <p className="text-muted-foreground mb-6">Choose how to highlight numbers in your document</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base">Highlight Type</Label>
                  <RadioGroup value={highlightType} onValueChange={setHighlightType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="circle" id="circle" />
                      <Label htmlFor="circle" className="cursor-pointer">Circle numbers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="highlight" id="highlight" />
                      <Label htmlFor="highlight" className="cursor-pointer">Highlight numbers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="both" />
                      <Label htmlFor="both" className="cursor-pointer">Both circle and highlight</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Number Type</Label>
                  <Select value={numberType} onValueChange={setNumberType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All numbers</SelectItem>
                      <SelectItem value="currency">Currency amounts only</SelectItem>
                      <SelectItem value="dates">Dates only</SelectItem>
                      <SelectItem value="percentages">Percentages only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Highlight Color</Label>
                  <Select value={colorChoice} onValueChange={setColorChoice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleNext} className="w-full">
                Start Processing
              </Button>
            </div>
          )}

          {currentStep === "processing" && (
            <div className="text-center py-12 space-y-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
              <div>
                <h2 className="text-2xl font-light text-foreground mb-2">Processing Document</h2>
                <p className="text-muted-foreground">Analyzing and highlighting numbers in your document...</p>
              </div>
            </div>
          )}

          {currentStep === "complete" && (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-light text-foreground mb-2">Processing Complete</h2>
                <p className="text-muted-foreground mb-6">Your document has been processed successfully</p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button variant="outline">Download PDF</Button>
                <Button onClick={handleStartNew}>Process Another Document</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CircleUpWorkflowPage;
