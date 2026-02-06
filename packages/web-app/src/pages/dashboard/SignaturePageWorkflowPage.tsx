import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileSignature, Check, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Step = "upload" | "configure" | "processing" | "complete";

const SignaturePageWorkflowPage = () => {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [templateType, setTemplateType] = useState<string>("standard");
  const [partyCount, setPartyCount] = useState<string>("2");
  const [includeWitness, setIncludeWitness] = useState<string>("no");
  const [dateFormat, setDateFormat] = useState<string>("mm-dd-yyyy");

  const steps: { id: Step; label: string; icon: typeof Upload }[] = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "configure", label: "Configure", icon: FileSignature },
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
    setTemplateType("standard");
    setPartyCount("2");
    setIncludeWitness("no");
    setDateFormat("mm-dd-yyyy");
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-light text-foreground">Signature Pages</h1>
        <p className="text-muted-foreground">Automatically create signature pages from agreement templates</p>
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
                <h2 className="text-2xl font-light text-foreground mb-4">Upload Agreement Template</h2>
                <p className="text-muted-foreground mb-6">Select the agreement document that needs signature pages</p>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-smooth">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {file ? file.name : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">Supports PDF, DOCX, DOC</p>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Select Document
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
                <h2 className="text-2xl font-light text-foreground mb-4">Configure Signature Page</h2>
                <p className="text-muted-foreground mb-6">Customize the signature page settings</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base">Signature Template Type</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Agreement</SelectItem>
                      <SelectItem value="corporate">Corporate Agreement</SelectItem>
                      <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                      <SelectItem value="employment">Employment Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Number of Parties</Label>
                  <Select value={partyCount} onValueChange={setPartyCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Parties</SelectItem>
                      <SelectItem value="3">3 Parties</SelectItem>
                      <SelectItem value="4">4 Parties</SelectItem>
                      <SelectItem value="5">5+ Parties</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Include Witness Lines</Label>
                  <RadioGroup value={includeWitness} onValueChange={setIncludeWitness}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="witness-yes" />
                      <Label htmlFor="witness-yes" className="cursor-pointer">Yes, include witness signatures</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="witness-no" />
                      <Label htmlFor="witness-no" className="cursor-pointer">No witness signatures needed</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      <SelectItem value="long">Month DD, YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleNext} className="w-full">
                Generate Signature Page
              </Button>
            </div>
          )}

          {currentStep === "processing" && (
            <div className="text-center py-12 space-y-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
              <div>
                <h2 className="text-2xl font-light text-foreground mb-2">Generating Signature Page</h2>
                <p className="text-muted-foreground">Creating your custom signature page...</p>
              </div>
            </div>
          )}

          {currentStep === "complete" && (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-light text-foreground mb-2">Signature Page Generated</h2>
                <p className="text-muted-foreground mb-6">Your signature page has been created successfully</p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button variant="outline">Download PDF</Button>
                <Button variant="outline">Download DOCX</Button>
                <Button onClick={handleStartNew}>Create Another Signature Page</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignaturePageWorkflowPage;
