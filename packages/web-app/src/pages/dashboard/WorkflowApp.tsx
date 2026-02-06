import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search,
  Sparkles,
  FileText,
  TrendingUp,
  Megaphone,
  Building2,
  Clock,
  CheckCircle2,
  PlayCircle,
  Archive,
  Zap,
  Workflow
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import SPAFlowChart from "@/components/workflow/SPAFlowChart";
import SupplyAgreementFlowChart from "@/components/workflow/SupplyAgreementFlowChart";
import { supabase } from "@/integrations/supabase/client";

type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  team: string;
  documentType?: string;
  autoSteps: string[];
  icon: any;
  color: string;
};

type ActiveWorkflow = {
  id: string;
  name: string;
  documentName: string;
  team: string;
  status: 'running' | 'completed' | 'pending';
  progress: number;
  createdAt: string;
};

const WorkflowApp = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'active'>('templates');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isCreatingAi, setIsCreatingAi] = useState(false);
  const [showSPAFlow, setShowSPAFlow] = useState(false);
  const [showSupplyFlow, setShowSupplyFlow] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const workflowTemplates: WorkflowTemplate[] = [
    {
      id: "spa-workflow",
      name: "Share Purchase Agreement",
      description: "Auto-detects board resolution requirements, routing to signatories, approval chain, and vault storage",
      team: "legal",
      documentType: "SPA",
      autoSteps: ["Upload Document", "Detect Requirements", "Board Resolution Check", "Route to Signatories", "Legal Review", "Final Approval", "Store in Vault"],
      icon: FileText,
      color: "bg-blue-500"
    },
    {
      id: "supply-agreement-analysis",
      name: "Supply Agreement Analysis",
      description: "Upload a supply agreement and Harvey will prepare a detailed list of red flags for your client",
      team: "legal",
      documentType: "Supply Agreement",
      autoSteps: ["Upload Agreement", "Select Party (Buyer/Supplier)", "Conditional Analysis", "AI Red Flag Identification", "Generate Report", "Review & Export"],
      icon: FileText,
      color: "bg-violet-500"
    },
    {
      id: "nda-workflow",
      name: "Non-Disclosure Agreement",
      description: "Streamlined NDA processing with automatic party identification and execution",
      team: "legal",
      documentType: "NDA",
      autoSteps: ["Upload Document", "Party Identification", "Internal Review", "Signing", "Archive"],
      icon: FileText,
      color: "bg-purple-500"
    },
    {
      id: "contract-review",
      name: "Contract Review & Approval",
      description: "Comprehensive contract review with multi-level approvals and compliance checks",
      team: "legal",
      autoSteps: ["Upload", "Initial Review", "Compliance Check", "Legal Approval", "Partner Approval", "Execute", "Store"],
      icon: CheckCircle2,
      color: "bg-indigo-500"
    },
    {
      id: "invoice-processing",
      name: "Invoice Processing",
      description: "Automated invoice validation, approval routing, and payment scheduling",
      team: "finance",
      autoSteps: ["Upload Invoice", "Data Extraction", "PO Matching", "Manager Approval", "Finance Approval", "Payment Queue"],
      icon: TrendingUp,
      color: "bg-green-500"
    },
    {
      id: "expense-report",
      name: "Expense Report",
      description: "Employee expense submission with automatic policy checks and reimbursement",
      team: "finance",
      autoSteps: ["Submit Expenses", "Policy Check", "Manager Approval", "Finance Review", "Payment Processing"],
      icon: TrendingUp,
      color: "bg-emerald-500"
    },
    {
      id: "budget-approval",
      name: "Budget Approval",
      description: "Multi-tier budget request and approval workflow with financial analysis",
      team: "finance",
      autoSteps: ["Submit Request", "Department Review", "Financial Analysis", "CFO Approval", "Board Approval (if needed)"],
      icon: TrendingUp,
      color: "bg-teal-500"
    },
    {
      id: "campaign-approval",
      name: "Marketing Campaign Approval",
      description: "Campaign review workflow with brand compliance and budget checks",
      team: "marketing",
      autoSteps: ["Submit Campaign", "Brand Review", "Legal Check", "Budget Approval", "Launch Approval"],
      icon: Megaphone,
      color: "bg-pink-500"
    },
    {
      id: "content-publishing",
      name: "Content Publishing",
      description: "Content review and publishing workflow with SEO and compliance checks",
      team: "marketing",
      autoSteps: ["Draft Content", "Editorial Review", "SEO Check", "Legal Review", "Publish"],
      icon: Megaphone,
      color: "bg-rose-500"
    },
    {
      id: "vendor-onboarding",
      name: "Vendor Onboarding",
      description: "Complete vendor verification and approval process",
      team: "operations",
      autoSteps: ["Vendor Application", "Due Diligence", "Legal Review", "Compliance Check", "Contract Setup", "Onboard"],
      icon: Building2,
      color: "bg-orange-500"
    },
    {
      id: "purchase-order",
      name: "Purchase Order",
      description: "PO creation and multi-level approval based on amount thresholds",
      team: "operations",
      autoSteps: ["Create PO", "Manager Approval", "Budget Check", "Procurement Approval", "Issue to Vendor"],
      icon: Building2,
      color: "bg-amber-500"
    }
  ];

  const activeWorkflows: ActiveWorkflow[] = [
    {
      id: "1",
      name: "Share Purchase Agreement",
      documentName: "Acme Corp SPA - Series B.pdf",
      team: "legal",
      status: "running",
      progress: 60,
      createdAt: "2 hours ago"
    },
    {
      id: "2",
      name: "Invoice Processing",
      documentName: "INV-2024-0342.pdf",
      team: "finance",
      status: "pending",
      progress: 30,
      createdAt: "5 hours ago"
    },
    {
      id: "3",
      name: "Marketing Campaign Approval",
      documentName: "Q1 Product Launch Campaign",
      team: "marketing",
      status: "running",
      progress: 80,
      createdAt: "1 day ago"
    },
    {
      id: "4",
      name: "NDA Workflow",
      documentName: "Vendor NDA - Tech Solutions Inc.pdf",
      team: "legal",
      status: "completed",
      progress: 100,
      createdAt: "2 days ago"
    }
  ];

  const teams = [
    { value: 'all', label: 'All Teams', icon: Building2 },
    { value: 'legal', label: 'Legal', icon: FileText },
    { value: 'finance', label: 'Finance', icon: TrendingUp },
    { value: 'marketing', label: 'Marketing', icon: Megaphone },
    { value: 'operations', label: 'Operations', icon: Building2 }
  ];

  const filteredTemplates = workflowTemplates.filter(template => {
    const matchesTeam = selectedTeam === 'all' || template.team === selectedTeam;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  const filteredActiveWorkflows = activeWorkflows.filter(workflow => {
    const matchesTeam = selectedTeam === 'all' || workflow.team === selectedTeam;
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.documentName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  const handleCreateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Please provide a description",
        description: "Describe the workflow you want to create",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-ai-workflow', {
        body: { prompt: aiPrompt }
      });

      if (error) {
        console.error('AI workflow creation error:', error);
        throw error;
      }

      if (data.success && data.workflow) {
        toast({
          title: "Workflow created!",
          description: `"${data.workflow.name}" is ready. ${data.workflow.steps.length} steps generated.`,
        });
        
        setAiPrompt("");
        setIsAiDialogOpen(false);
        
        // Optionally add the new workflow to active workflows
        console.log("Generated workflow:", data.workflow);
      } else {
        throw new Error("Failed to generate workflow");
      }
    } catch (error) {
      console.error('Error creating AI workflow:', error);
      toast({
        title: "Failed to create workflow",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAi(false);
    }
  };

  const handleTemplateClick = (template: WorkflowTemplate) => {
    if (template.id === "spa-workflow") {
      setShowSPAFlow(true);
    } else if (template.id === "supply-agreement-analysis") {
      setShowSupplyFlow(true);
    } else if (template.id === "ma-review") {
      navigate("/dashboard/vault/ma-review");
    } else {
      toast({
        title: "Workflow Initiated",
        description: `Starting ${template.name} workflow...`,
      });
    }
  };

  // Show SPA Flow Chart if selected
  if (showSPAFlow) {
    return (
      <div className="p-6">
        <Button 
          variant="ghost" 
          onClick={() => setShowSPAFlow(false)}
          className="mb-4"
        >
          ← Back to Templates
        </Button>
        <SPAFlowChart />
      </div>
    );
  }

  // Show Supply Agreement Flow Chart if selected
  if (showSupplyFlow) {
    return (
      <div className="p-6">
        <Button 
          variant="ghost" 
          onClick={() => setShowSupplyFlow(false)}
          className="mb-4"
        >
          ← Back to Templates
        </Button>
        <SupplyAgreementFlowChart />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div></div>
            
          <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 rounded-full shadow-sm">
                <Sparkles className="h-4 w-4" />
                Create with AI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Create Workflow with AI
                </DialogTitle>
                <DialogDescription>
                  Describe your workflow and AI will generate the steps, approvals, and routing automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Textarea
                  placeholder="Example: When a sales contract is uploaded, it should go through legal review, then CFO approval if over $100k, then get signed by both parties, and finally stored in vault with the client name..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
                <Button 
                  onClick={handleCreateWithAI} 
                  disabled={isCreatingAi}
                  className="w-full"
                >
                  {isCreatingAi ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-pulse" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Workflow
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0"
            />
          </div>

          <div className="flex items-center gap-2 bg-muted/50 rounded-full p-1">
            {teams.map((team) => (
              <Button
                key={team.value}
                variant={selectedTeam === team.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedTeam(team.value)}
                className={`rounded-full gap-2 ${selectedTeam === team.value ? '' : 'hover:bg-transparent'}`}
              >
                <team.icon className="h-3.5 w-3.5" />
                {team.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="templates" className="gap-2 rounded-md">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2 rounded-md">
              <PlayCircle className="h-4 w-4" />
              Active Workflows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className="group hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 rounded-2xl ${template.color} shrink-0`}>
                        <template.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                          {template.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs font-normal capitalize">
                          {template.team}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        Auto-generates {template.autoSteps.length} steps
                      </div>
                      {template.documentType && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          Optimized for {template.documentType}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No workflow templates found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {filteredActiveWorkflows.map((workflow) => (
              <Card key={workflow.id} className="group hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground">{workflow.name}</h3>
                        <Badge 
                          variant={workflow.status === 'completed' ? 'default' : workflow.status === 'running' ? 'secondary' : 'outline'}
                          className="capitalize"
                        >
                          {workflow.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{workflow.documentName}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {workflow.createdAt}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{workflow.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${workflow.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredActiveWorkflows.length === 0 && (
              <div className="text-center py-12">
                <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No active workflows</p>
                <p className="text-sm text-muted-foreground mt-1">Start a workflow from templates to see it here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default WorkflowApp;
