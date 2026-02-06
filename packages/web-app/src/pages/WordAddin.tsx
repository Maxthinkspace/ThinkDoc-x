import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  FileText, 
  CheckCircle, 
  MessageSquare, 
  Search, 
  BookOpen, 
  Shield, 
  Calendar,
  Database,
  Users,
  Mail,
  BarChart3
} from "lucide-react";

const WordAddin = () => {
  const draftingFeatures = [
    {
      icon: FileText,
      title: "Draft with precedents",
      description: "Adapt past agreements by replacing transaction details"
    },
    {
      icon: BookOpen,
      title: "Draft with templates",
      description: "Fill in guided blanks in structured templates"
    },
    {
      icon: Shield,
      title: "Draft with playbooks",
      description: "Apply playbook rules while drafting from precedents or templates"
    },
    {
      icon: Database,
      title: "Redact a precedent into a template",
      description: "Turn a signed agreement into a reusable template"
    }
  ];

  const reviewingFeatures = [
    {
      icon: Shield,
      title: "Review with playbooks",
      description: "Check contracts against predefined playbook rules"
    },
    {
      icon: Search,
      title: "Review with precedents",
      description: "Compare a contract to past signed agreements"
    },
    {
      icon: CheckCircle,
      title: "General review",
      description: "Clause-by-clause review without external aids"
    }
  ];

  const commentsFeatures = [
    {
      icon: MessageSquare,
      title: "Understand comments",
      description: "Interpret suggested changes and abstract feedback"
    },
    {
      icon: Users,
      title: "Consolidate comments",
      description: "Merge tracked changes from multiple versions"
    },
    {
      icon: Mail,
      title: "Summarize comments (email drafting)",
      description: "Turn revisions into client update emails"
    },
    {
      icon: BookOpen,
      title: "Generate a playbook from annotations",
      description: "Create playbooks from tracked changes/comments"
    }
  ];

  const otherFeatures = [
    {
      icon: BarChart3,
      title: "Summarize in Vault (tabular)",
      description: "Convert multiple contracts into structured tables"
    },
    {
      icon: Database,
      title: "Generate a playbook from Vault tables",
      description: "Create playbooks from summarized historical practices"
    },
    {
      icon: MessageSquare,
      title: "Understand a contract",
      description: "Simplify contents for non-lawyers (Ask)"
    },
    {
      icon: Calendar,
      title: "Contract compliance workflow",
      description: "Derive execution timelines and compliance milestones"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-7xl font-light text-foreground mb-8 leading-tight">
                ThinkDoc
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto font-light">
                AI Contract Review & Draft Tool
              </p>
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground px-12 py-4 text-lg rounded-full transition-smooth">
                Book a Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Sidebar Preview */}
        <section className="py-32 bg-muted">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-light text-foreground mb-8">
                How It Appears in Word
              </h2>
              <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
                Seamlessly integrated into Microsoft Word as a sidebar panel
              </p>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="bg-background rounded-lg shadow-2xl overflow-hidden border">
                <div className="flex">
                  {/* Word Document Area */}
                  <div className="flex-1 bg-white p-8 min-h-[600px]">
                    <div className="max-w-2xl">
                      <h3 className="text-2xl font-bold text-gray-800 mb-6">Non-Disclosure Undertaking</h3>
                      <div className="space-y-4 text-gray-600">
                        <p className="leading-relaxed">
                          This Non-Disclosure Undertaking ("Undertaking") is made by [COMPANY NAME], a company incorporated in Singapore (the "Company").
                        </p>
                        <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 py-2">
                          <p className="font-semibold text-blue-800">1. PURPOSE</p>
                          <p className="text-sm mt-1">
                            The parties intend to engage in discussions, collaboration, and testing relating to certain products and services offered by the Company...
                          </p>
                        </div>
                        <p>2. CONFIDENTIAL INFORMATION</p>
                        <p>2.1. "Confidential Information" means any proprietary information...</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* ThinkSpace Sidebar */}
                  <div className="w-80 bg-gray-50 border-l border-gray-200">
                    <div className="p-6">
                      <div className="flex items-center justify-end mb-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Redact document for confidentiality</span>
                          <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                            <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                          </div>
                        </div>
                      </div>
                      
                      <Tabs defaultValue="review" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                          <TabsTrigger value="review" className="text-xs">Review</TabsTrigger>
                          <TabsTrigger value="draft" className="text-xs">Draft</TabsTrigger>
                          <TabsTrigger value="ask" className="text-xs">Ask</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="review" className="space-y-3">
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <Shield className="h-5 w-5 text-blue-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Review with Playbooks</h5>
                                  <p className="text-xs text-gray-500">Use structured review guidelines</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <Search className="h-5 w-5 text-green-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Review with Precedents</h5>
                                  <p className="text-xs text-gray-500">Find similar contract clauses</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <CheckCircle className="h-5 w-5 text-purple-600" />
                                <div>
                                  <h5 className="font-medium text-sm">General Review</h5>
                                  <p className="text-xs text-gray-500">Comprehensive contract analysis</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <Users className="h-5 w-5 text-orange-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Negotiations</h5>
                                  <p className="text-xs text-gray-500">Negotiation strategy and guidance</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <MessageSquare className="h-5 w-5 text-red-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Understand redlines</h5>
                                  <p className="text-xs text-gray-500">Analyze tracked changes</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Summarize redlines</h5>
                                  <p className="text-xs text-gray-500">Executive summary of changes</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                        
                        <TabsContent value="draft" className="space-y-3">
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <Search className="h-5 w-5 text-blue-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Draft with Precedents</h5>
                                  <p className="text-xs text-gray-500">Generate based on similar contracts</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-green-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Draft with Templates</h5>
                                  <p className="text-xs text-gray-500">Use pre-built document templates</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <Shield className="h-5 w-5 text-purple-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Draft with Playbooks</h5>
                                  <p className="text-xs text-gray-500">Create using structured guidelines</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <MessageSquare className="h-5 w-5 text-orange-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Process comments</h5>
                                  <p className="text-xs text-gray-500">Incorporate feedback and revisions</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                        
                        <TabsContent value="ask" className="space-y-3">
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Understand my contract</h5>
                                  <p className="text-xs text-gray-500">Get detailed explanations of terms</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="cursor-pointer hover:bg-gray-50">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <Calendar className="h-5 w-5 text-green-600" />
                                <div>
                                  <h5 className="font-medium text-sm">Extract timeline of key events</h5>
                                  <p className="text-xs text-gray-500">Identify important dates and deadlines</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Features */}
        <section className="py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-light text-foreground mb-8">
                Complete Feature Set
              </h2>
            </div>

            <div className="max-w-7xl mx-auto">
              <Tabs defaultValue="drafting" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-12">
                  <TabsTrigger value="drafting">Drafting</TabsTrigger>
                  <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
                  <TabsTrigger value="comments">Comments & Summaries</TabsTrigger>
                  <TabsTrigger value="others">Others</TabsTrigger>
                </TabsList>

                <TabsContent value="drafting">
                  <div className="grid md:grid-cols-2 gap-8">
                    {draftingFeatures.map((feature, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <feature.icon className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-light">{feature.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-base font-light">
                            {feature.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="reviewing">
                  <div className="grid md:grid-cols-2 gap-8">
                    {reviewingFeatures.map((feature, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <feature.icon className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-light">{feature.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-base font-light">
                            {feature.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="comments">
                  <div className="grid md:grid-cols-2 gap-8">
                    {commentsFeatures.map((feature, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <feature.icon className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-light">{feature.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-base font-light">
                            {feature.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="others">
                  <div className="grid md:grid-cols-2 gap-8">
                    {otherFeatures.map((feature, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <feature.icon className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-light">{feature.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-base font-light">
                            {feature.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 bg-muted">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-light text-foreground mb-8">
                Ready to Transform Your Contract Workflow?
              </h2>
              
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground px-12 py-4 text-lg rounded-full transition-smooth mb-8">
                Book a Demo
              </Button>

              <p className="text-sm text-muted-foreground font-light">
                30-day free trial • No credit card required
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default WordAddin;