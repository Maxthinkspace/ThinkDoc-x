import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Users, Search, FileText, ArrowRight, TrendingUp, Clock, Shield } from "lucide-react";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 lg:px-12">
          {/* Welcome Section */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-light text-foreground mb-6">
                Welcome to ThinkSpace
              </h1>
              <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto">
                Your AI-powered legal workspace. Access all your tools and streamline your legal operations.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-4 gap-6 mb-16">
              <Card className="bg-card border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                    <p className="text-2xl font-light text-foreground">12</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </Card>
              
              <Card className="bg-card border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documents Processed</p>
                    <p className="text-2xl font-light text-foreground">847</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </Card>
              
              <Card className="bg-card border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Time Saved</p>
                    <p className="text-2xl font-light text-foreground">156h</p>
                  </div>
                  <Clock className="h-8 w-8 text-primary" />
                </div>
              </Card>
              
              <Card className="bg-card border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Compliance Score</p>
                    <p className="text-2xl font-light text-foreground">98%</p>
                  </div>
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </Card>
            </div>
          </div>

          {/* Main Products Section */}
          <div className="max-w-6xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-12 text-center">
              Your Legal AI Suite
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Vault */}
              <Card className="bg-card border-border group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Database className="h-8 w-8 text-primary" />
                    </div>
                    <Button variant="ghost" size="sm" asChild className="group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <a href="/legal/vault" className="flex items-center">
                        Launch <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <CardTitle className="text-2xl font-light">Vault</CardTitle>
                  <CardDescription className="text-lg">
                    Contract Database Management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-light mb-6">
                    Centralized contract repository with AI-powered search, categorization, and risk analysis. 
                    Instantly find clauses, track obligations, and manage contract lifecycles.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Smart search across all contracts
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Automated risk analysis
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Lifecycle tracking & alerts
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Workflow */}
              <Card className="bg-card border-border group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <Button variant="ghost" size="sm" asChild className="group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <a href="/legal/workflow" className="flex items-center">
                        Launch <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <CardTitle className="text-2xl font-light">Workflow</CardTitle>
                  <CardDescription className="text-lg">
                    Cross-Team Document Collaboration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-light mb-6">
                    Seamless collaboration between legal, finance, and business teams. 
                    Streamline document review, approval processes, and stakeholder communication.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Multi-team review coordination
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Automated approval routing
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Real-time communication
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Research */}
              <Card className="bg-card border-border group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Search className="h-8 w-8 text-primary" />
                    </div>
                    <Button variant="ghost" size="sm" asChild className="group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <a href="/legal/research" className="flex items-center">
                        Launch <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <CardTitle className="text-2xl font-light">Research</CardTitle>
                  <CardDescription className="text-lg">
                    Global Legislation Analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-light mb-6">
                    AI-powered research across global jurisdictions. Stay current with regulatory changes, 
                    compliance requirements, and legal precedents across different countries.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      150+ countries covered
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Real-time regulatory tracking
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      AI-powered precedent analysis
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Junior */}
              <Card className="bg-card border-border group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <Button variant="ghost" size="sm" asChild className="group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <a href="/legal/junior" className="flex items-center">
                        Launch <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <CardTitle className="text-2xl font-light">Junior</CardTitle>
                  <CardDescription className="text-lg">
                    Document Processing Suite
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-light mb-6">
                    Complete suite of junior-level document processing tools. Automate routine tasks 
                    and streamline document workflows for legal teams.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Automated document sorting
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Term extraction & analysis
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      Workflow automation
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-8 text-center">
              Recent Activity
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-xl font-light">Recent Documents</CardTitle>
                  <CardDescription>Documents you've worked on recently</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Service Agreement - TechCorp</p>
                        <p className="text-xs text-muted-foreground">Reviewed 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">NDA - Global Industries</p>
                        <p className="text-xs text-muted-foreground">Processed yesterday</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">License Agreement - DataFlow</p>
                        <p className="text-xs text-muted-foreground">Approved 3 days ago</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-xl font-light">Pending Tasks</CardTitle>
                  <CardDescription>Items requiring your attention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Contract renewal due</p>
                        <p className="text-xs text-muted-foreground">Supply Agreement - Expires in 5 days</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Review</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium">Team review requested</p>
                        <p className="text-xs text-muted-foreground">M&A Documentation - Legal team</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Join</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Search className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Research request</p>
                        <p className="text-xs text-muted-foreground">EU privacy regulations update</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Start</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;