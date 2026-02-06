import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calculator, DollarSign, Users, HelpCircle, Building } from "lucide-react";

const professions = [
  { id: "legal", label: "Legal", icon: Briefcase },
  { id: "tax", label: "Tax", icon: Calculator },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "accounting", label: "Accounting", icon: Building },
  { id: "consulting", label: "Consulting", icon: Users },
  { id: "unspecified", label: "Unspecified", icon: HelpCircle },
];

const practiceAreas = [
  "Antitrust & Competition", "Banking & Finance", "Bankruptcy & Restructuring", "Capital Markets", "Commercial Law",
  "Compliance & Regulatory", "Corporate", "Corporate Governance", "Criminal Law", "Data Privacy/Cybersecurity",
  "Emerging Companies/Venture Capital", "Energy & Infrastructure", "Environmental Law",
  "Executive Compensation & Employee Benefits", "Family Law", "Government & Public Affairs", "Intellectual Property",
  "International Arbitration", "Investment Funds & Management", "Labor & Employment", "Litigation (General)",
  "Mergers & Acquisitions", "Personal Injury", "Private Equity", "Private Wealth", "Public Law",
  "Real Estate & REITs", "Tax", "White Collar & Investigations"
];

export default function ProfileSettings() {
  const [selectedProfession, setSelectedProfession] = useState("legal");
  const [jobTitle, setJobTitle] = useState("Knowledge Manager/Librarian");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [language, setLanguage] = useState("en-us");
  const [location, setLocation] = useState("");

  const toggleArea = (area: string) => {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
    } else if (selectedAreas.length < 3) {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your profile</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Primary profession</CardTitle>
          <CardDescription>
            Select one that best matches your current position. This will help us provide tailored content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {professions.map((prof) => {
              const Icon = prof.icon;
              const isSelected = selectedProfession === prof.id;
              return (
                <button
                  key={prof.id}
                  onClick={() => setSelectedProfession(prof.id)}
                  className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{prof.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-title">Job title</Label>
            <p className="text-sm text-muted-foreground">
              Select the title that most closely matches your current position. You will still have access to all content, regardless of your selection.
            </p>
            <Select value={jobTitle} onValueChange={setJobTitle}>
              <SelectTrigger id="job-title">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Knowledge Manager/Librarian">Knowledge Manager/Librarian</SelectItem>
                <SelectItem value="Partner">Partner</SelectItem>
                <SelectItem value="Associate">Associate</SelectItem>
                <SelectItem value="Counsel">Counsel</SelectItem>
                <SelectItem value="Legal Assistant">Legal Assistant</SelectItem>
                <SelectItem value="Paralegal">Paralegal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Practice areas</Label>
            <p className="text-sm text-muted-foreground">
              Content most relevant to your practice area will be presented first in ThinkSpace.
            </p>
            <p className="text-sm font-medium text-foreground">Select up to 3.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {practiceAreas.map((area) => (
                <Badge
                  key={area}
                  variant={selectedAreas.includes(area) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArea(area)}
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Preferred language</Label>
            <p className="text-sm text-muted-foreground">
              ThinkSpace replies in the language of your prompt but will use a specific dialect (e.g., American English, British English) if specified.
            </p>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-us">English (American)</SelectItem>
                <SelectItem value="en-gb">English (British)</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Primary work location</Label>
            <p className="text-sm text-muted-foreground">Write up to 32 characters.</p>
            <Input
              id="location"
              placeholder="E.g., San Francisco, New York, London"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={32}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline">Reset</Button>
            <Button>Saved</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
