import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileText, BarChart3, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const DashboardHome = () => {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-foreground mb-1.5 tracking-tight">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your contract database and run AI-powered analysis
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:border-primary/30 transition-colors border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary/5 rounded-md">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-medium">Vault</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upload contracts, organize into projects, and extract key information with AI.
            </p>
            <Link to="/dashboard/vault">
              <Button size="sm" className="w-full h-8 text-xs">
                Open Vault
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/30 transition-colors border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary/5 rounded-md">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-medium">M&A Review</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bulk analyze merger agreements with customizable extraction columns.
            </p>
            <Link to="/dashboard/vault/ma-review">
              <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                Start Review
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">1</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">Create a Project</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organize your contracts into projects for easy management
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">Upload Documents</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add contracts from your computer or connected services
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">3</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">Run AI Analysis</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Extract key terms, dates, and clauses automatically
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
