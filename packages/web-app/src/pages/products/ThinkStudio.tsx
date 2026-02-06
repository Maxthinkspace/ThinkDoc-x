import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight,
  Server,
  Database,
  Bot,
  MessageSquare,
  Link as LinkIcon,
  Check
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const ThinkStudio = () => {
  const [activeCapability, setActiveCapability] = useState<number>(0);

  const capabilities: Array<{
    title: string;
    icon: typeof Server;
    description: string;
    features: string[];
  }> = [
    {
      title: "Local LLM",
      icon: Server,
      description: "Run powerful language models on your own infrastructure. ThinkStudio supports local deployment of leading open-source models, ensuring your data never leaves your environment while maintaining enterprise-grade performance.",
      features: [
        "On-premise deployment options",
        "Support for Llama, Mistral, and more",
        "GPU optimization & scaling",
        "Complete data sovereignty"
      ]
    },
    {
      title: "Knowledge Base",
      icon: Database,
      description: "Build a unified, searchable knowledge repository from all your enterprise data. ThinkStudio indexes documents, emails, and structured data to create a semantic search layer across your organization.",
      features: [
        "Semantic document indexing",
        "Cross-source unified search",
        "Automatic categorization",
        "Version control & history"
      ]
    },
    {
      title: "AI Agents",
      icon: Bot,
      description: "Create custom AI agents that automate complex workflows. From document review to data extraction, agents can be configured to handle multi-step processes with human-in-the-loop oversight.",
      features: [
        "Visual workflow builder",
        "Multi-step automation",
        "Conditional logic & branching",
        "Human-in-the-loop controls"
      ]
    },
    {
      title: "AI Assistant",
      icon: MessageSquare,
      description: "Deploy conversational AI assistants that understand your business context. Assistants can answer questions, draft documents, and provide insights grounded in your enterprise knowledge.",
      features: [
        "Context-aware responses",
        "Citation & traceability",
        "Custom persona configuration",
        "Multi-turn conversations"
      ]
    },
    {
      title: "Connectors",
      icon: LinkIcon,
      description: "Integrate with your existing tools and data sources seamlessly. ThinkStudio provides 100+ pre-built connectors for enterprise systems, cloud storage, and collaboration platforms.",
      features: [
        "100+ pre-built integrations",
        "Real-time data sync",
        "Custom API support",
        "Enterprise SSO & permissions"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-24 md:py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                {/* Left Column */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-xl md:text-2xl font-serif text-foreground">ThinkStudio</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                      Platform
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground mb-8 leading-tight">
                    Your foundation for enterprise AI
                  </h1>
                  <div className="flex flex-wrap gap-4">
                    <Link to="/demo">
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 py-3 text-base">
                        Get started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/demo">
                      <Button variant="outline" className="rounded-lg px-6 py-3 text-base">
                        Contact us
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">ThinkStudio</span> is the operating system for enterprise AI. 
                    Combining local LLM deployment, knowledge management, AI agents, and seamless 
                    integrations—it delivers a complete platform for building AI-powered workflows 
                    that stay secure within your infrastructure.
                  </p>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    Built for legal, finance, and compliance teams, ThinkStudio scales from quick 
                    Q&A to complex multi-step review workflows. Your team builds custom use cases 
                    on top of a unified AI foundation—without the complexity of managing multiple 
                    point solutions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                  Everything you need to build enterprise AI
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Five core capabilities that work together to power your AI initiatives
                </p>
              </div>

              <div className="grid lg:grid-cols-12 gap-8">
                {/* Capability Tabs */}
                <div className="lg:col-span-4 space-y-2">
                  {capabilities.map((capability, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveCapability(index)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-4 ${
                        activeCapability === index
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-background/80 text-foreground border border-border/50"
                      }`}
                    >
                      <capability.icon className={`h-5 w-5 ${
                        activeCapability === index ? "text-primary-foreground" : "text-primary"
                      }`} />
                      <span className="font-medium">{capability.title}</span>
                    </button>
                  ))}
                </div>

                {/* Capability Details */}
                <div className="lg:col-span-8">
                  <div className="bg-background rounded-2xl border border-border/50 p-8 h-full">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        {(() => {
                          const Icon = capabilities[activeCapability].icon;
                          return <Icon className="h-6 w-6 text-primary" />;
                        })()}
                      </div>
                      <h3 className="text-2xl font-serif text-foreground">
                        {capabilities[activeCapability].title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                      {capabilities[activeCapability].description}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {capabilities[activeCapability].features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Build Your Use Case Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                  Build any use case on ThinkStudio
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  From simple Q&A to complex multi-step workflows—ThinkStudio provides the building blocks
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: "Contract Review",
                    description: "Automate clause extraction, risk flagging, and playbook-driven review across deal documents."
                  },
                  {
                    title: "Due Diligence",
                    description: "Build custom extraction workflows to analyze hundreds of documents in hours, not weeks."
                  },
                  {
                    title: "Research Assistant",
                    description: "Create AI assistants that search across your knowledge base and provide cited answers."
                  },
                  {
                    title: "Compliance Monitoring",
                    description: "Set up agents that track regulatory changes and flag relevant updates automatically."
                  },
                  {
                    title: "Document Drafting",
                    description: "Generate first drafts grounded in your precedents and templates with full traceability."
                  },
                  {
                    title: "Custom Workflows",
                    description: "Design any multi-step process with conditional logic, approvals, and human oversight."
                  }
                ].map((useCase, index) => (
                  <div 
                    key={index} 
                    className="p-6 bg-muted/30 rounded-xl border border-border/30 hover:border-primary/30 transition-colors"
                  >
                    <h3 className="text-lg font-serif text-foreground mb-3">{useCase.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{useCase.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                Ready to build on ThinkStudio?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                See how ThinkStudio can power your enterprise AI initiatives with a personalized demo.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/demo">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8 py-3 text-base">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/demo">
                  <Button variant="outline" className="rounded-lg px-8 py-3 text-base">
                    Contact us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ThinkStudio;

