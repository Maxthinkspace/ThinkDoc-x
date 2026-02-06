import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, Users, FileSignature, Archive, AlertCircle, Clock, ArrowRight, CheckCircle2 } from "lucide-react";

const SPAFlowChart = () => {
  const steps = [
    {
      id: 1,
      title: "Upload Agreement",
      description: "Upload Share Purchase Agreement document",
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      status: "completed"
    },
    {
      id: 2,
      title: "Review Agreement",
      description: "Legal team reviews terms and conditions",
      icon: CheckCircle,
      color: "from-purple-500 to-purple-600",
      status: "completed",
      substeps: ["Review parties involved", "Check purchase price", "Verify representations", "Review warranties"]
    },
    {
      id: 3,
      title: "Board Resolution Required?",
      description: "System checks if board approval needed",
      icon: AlertCircle,
      color: "from-orange-500 to-orange-600",
      status: "active",
      decision: true
    },
    {
      id: 4,
      title: "Board Resolution",
      description: "Draft and circulate board resolution",
      icon: Users,
      color: "from-indigo-500 to-indigo-600",
      status: "pending",
      substeps: ["Draft resolution", "Circulate to board", "Collect votes", "Record minutes"]
    },
    {
      id: 5,
      title: "Management Approval",
      description: "Route to authorized signatories",
      icon: CheckCircle2,
      color: "from-teal-500 to-teal-600",
      status: "pending",
      substeps: ["CEO approval", "CFO approval", "Legal counsel sign-off"]
    },
    {
      id: 6,
      title: "Execution & Signing",
      description: "Execute agreement with all parties",
      icon: FileSignature,
      color: "from-green-500 to-green-600",
      status: "pending",
      substeps: ["Buyer signature", "Seller signature", "Witness signatures", "Timestamp document"]
    },
    {
      id: 7,
      title: "Store in Vault",
      description: "Archive completed agreement securely",
      icon: Archive,
      color: "from-gray-500 to-gray-600",
      status: "pending"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-950/20';
      case 'active':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 ring-4 ring-blue-100 dark:ring-blue-900/30';
      case 'pending':
        return 'border-gray-300 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'active':
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-light text-foreground">
          Share Purchase Agreement Workflow
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Complete automated workflow from document upload to secure vault storage
        </p>
      </div>

      {/* Flow Chart */}
      <div className="relative max-w-4xl mx-auto">
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Step Card */}
              <Card className={`border-2 transition-all ${getStatusColor(step.status)}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Step Number & Icon */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                        <step.icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        Step {step.id}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {step.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusIcon(step.status)}
                          <span className="text-xs font-medium capitalize text-muted-foreground">
                            {step.status}
                          </span>
                        </div>
                      </div>

                      {/* Substeps */}
                      {step.substeps && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {step.substeps.map((substep, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 p-2 rounded-lg border border-border/50"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {substep}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Decision Node */}
                      {step.decision && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                            <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                              ✓ Yes - Proceed
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Board resolution required
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              ✗ No - Skip
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Direct to approval
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connector Arrow */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-3">
                  <div className={`flex flex-col items-center gap-1 ${
                    step.status === 'completed' 
                      ? 'text-green-500' 
                      : step.status === 'active'
                      ? 'text-blue-500'
                      : 'text-gray-300'
                  }`}>
                    <ArrowRight className="h-5 w-5 rotate-90" />
                    <div className="h-4 w-0.5 bg-current" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Info */}
      <Card className="max-w-4xl mx-auto bg-muted/30">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-light text-foreground mb-1">
                2-3 days
              </div>
              <div className="text-xs text-muted-foreground">
                Estimated Timeline
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-foreground mb-1">
                5 parties
              </div>
              <div className="text-xs text-muted-foreground">
                Total Approvers
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-foreground mb-1">
                Auto
              </div>
              <div className="text-xs text-muted-foreground">
                Vault Storage
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SPAFlowChart;
