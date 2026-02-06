import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  FileText, 
  Table2, 
  MessageSquare, 
  BarChart3,
  Scale,
  FileSearch,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  tags: string[];
}

const VaultWorkflowsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All" },
    { id: "extraction", label: "Extraction" },
    { id: "analysis", label: "Analysis" },
    { id: "comparison", label: "Comparison" },
    { id: "review", label: "Review" },
  ];

  const workflowTemplates: WorkflowTemplate[] = [
    {
      id: "extract-terms",
      name: "Extract Terms from Agreements",
      description: "Upload documents, and AI will generate a table with key terms extracted from each agreement.",
      category: "extraction",
      icon: Table2,
      tags: ["Merger Agreement", "Contract"],
    },
    {
      id: "change-of-control",
      name: "Analyze Change of Control Provisions",
      description: "Generate a table showing the effect of change of control provisions on each agreement.",
      category: "analysis",
      icon: Scale,
      tags: ["Merger Agreement"],
    },
    {
      id: "reps-warranties",
      name: "Identify Representations and Warranties",
      description: "Extract and summarize all representations and warranties from your documents.",
      category: "extraction",
      icon: FileSearch,
      tags: ["M&A", "Due Diligence"],
    },
    {
      id: "non-compete",
      name: "Analyze Non-Compete Clauses",
      description: "Identify and analyze non-compete provisions across multiple agreements.",
      category: "analysis",
      icon: AlertTriangle,
      tags: ["Employment", "M&A"],
    },
    {
      id: "indemnification",
      name: "Compare Indemnification Clauses",
      description: "Compare indemnification provisions across documents and identify key differences.",
      category: "comparison",
      icon: BarChart3,
      tags: ["Contract", "M&A"],
    },
    {
      id: "material-terms",
      name: "Extract Material Terms",
      description: "Identify and extract material terms including pricing, duration, and termination rights.",
      category: "extraction",
      icon: FileText,
      tags: ["Commercial", "Contract"],
    },
    {
      id: "risk-assessment",
      name: "Contract Risk Assessment",
      description: "AI-powered analysis to identify potential risks and red flags in your documents.",
      category: "review",
      icon: AlertTriangle,
      tags: ["Risk", "Review"],
    },
    {
      id: "obligation-tracker",
      name: "Extract Obligations",
      description: "Identify and categorize all obligations and commitments in your agreements.",
      category: "extraction",
      icon: MessageSquare,
      tags: ["Compliance", "Contract"],
    },
  ];

  const filteredTemplates = workflowTemplates.filter(template => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-8 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Vault Workflows</h1>
            <p className="text-sm text-muted-foreground">Select a workflow template to analyze your documents</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 overflow-auto">
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="rounded-full"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Create Custom */}
        <div className="mb-8">
          <Card className="border-dashed hover:border-foreground/30 transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Create Custom Query</h3>
                <p className="text-sm text-muted-foreground">Define your own analysis with custom columns and prompts</p>
              </div>
              <Plus className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Workflow Templates Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Workflow Templates</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id}
                className="hover:border-foreground/30 transition-colors cursor-pointer group"
                onClick={() => navigate('/dashboard/vault')}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-muted">
                      <template.icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No workflows found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultWorkflowsPage;