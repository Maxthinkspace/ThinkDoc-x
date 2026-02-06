import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  UserCheck, 
  GitBranch, 
  AlertTriangle, 
  FileText, 
  Download,
  ArrowRight,
  CheckCircle,
  Clock
} from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Upload Agreement",
    description: "Upload supply agreement document",
    icon: Upload,
    status: "completed"
  },
  {
    id: 2,
    title: "Select Party",
    description: "Choose Buyer or Supplier",
    icon: UserCheck,
    status: "completed"
  },
  {
    id: 3,
    title: "AI Analysis",
    description: "Conditional risk analysis",
    icon: GitBranch,
    status: "active"
  },
  {
    id: 4,
    title: "Red Flags",
    description: "Identify potential issues",
    icon: AlertTriangle,
    status: "pending"
  },
  {
    id: 5,
    title: "Generate Report",
    description: "Create detailed findings",
    icon: FileText,
    status: "pending"
  },
  {
    id: 6,
    title: "Export",
    description: "Client-ready document",
    icon: Download,
    status: "pending"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "border-green-500/50 bg-green-500/5";
    case "active":
      return "border-blue-500 bg-blue-500/10";
    case "pending":
      return "border-border/30 bg-muted/20";
    default:
      return "border-border";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "active":
      return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    default:
      return null;
  }
};

export default function SupplyAgreementFlowChart() {
  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-light">Supply Agreement Analysis</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          AI-powered analysis to identify red flags and risks based on your client's position
        </p>
      </div>

      {/* Horizontal Flow */}
      <div className="relative bg-muted/20 rounded-2xl p-8">
        {/* Connection Lines */}
        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-border -translate-y-1/2 hidden lg:block" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 relative">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Step Card */}
              <Card className={`p-6 transition-all duration-300 ${getStatusColor(step.status)} hover:shadow-lg relative z-10`}>
                <div className="space-y-4">
                  {/* Icon */}
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${
                      step.status === "completed" ? "bg-green-500/20" :
                      step.status === "active" ? "bg-blue-500/20" :
                      "bg-muted/50"
                    }`}>
                      <step.icon className={`h-5 w-5 ${
                        step.status === "completed" ? "text-green-600" :
                        step.status === "active" ? "text-blue-600" :
                        "text-muted-foreground"
                      }`} />
                    </div>
                    {getStatusIcon(step.status)}
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">STEP {step.id}</span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <Badge variant={
                    step.status === "completed" ? "default" :
                    step.status === "active" ? "secondary" :
                    "outline"
                  } className="text-xs">
                    {step.status}
                  </Badge>
                </div>
              </Card>

              {/* Arrow Between Steps (Desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-2 -translate-y-1/2 z-20">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    step.status === "completed" ? "bg-green-500" :
                    step.status === "active" ? "bg-blue-500" :
                    "bg-border"
                  }`}>
                    <ArrowRight className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-foreground">Buyer Analysis</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                <span>Price and payment term risks</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                <span>Supplier default protections</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                <span>Quality assurance gaps</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                <span>Termination clause fairness</span>
              </li>
            </ul>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-foreground">Supplier Analysis</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                <span>Buyer payment obligations</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                <span>Liability cap protections</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                <span>Force majeure coverage</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                <span>Minimum order requirements</span>
              </li>
            </ul>
          </div>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card className="p-8 bg-gradient-to-r from-background to-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-3xl font-light text-foreground">~5 min</div>
            <div className="text-sm text-muted-foreground">Analysis Time</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-light text-foreground flex items-center justify-center gap-2">
              <AlertTriangle className="h-7 w-7 text-orange-500" />
              AI-Powered
            </div>
            <div className="text-sm text-muted-foreground">Risk Detection</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-light text-foreground flex items-center justify-center gap-2">
              <Download className="h-7 w-7 text-green-500" />
              Export
            </div>
            <div className="text-sm text-muted-foreground">Client-Ready Report</div>
          </div>
        </div>
      </Card>

      {/* CTA */}
      <div className="text-center">
        <Button size="lg" className="gap-2 rounded-full px-8">
          <Upload className="h-5 w-5" />
          Start Analysis
        </Button>
      </div>
    </div>
  );
}
