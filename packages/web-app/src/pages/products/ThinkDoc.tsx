import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight,
  Check,
  BookOpen,
  FileSearch,
  GitCompare,
  ListChecks,
  FileText,
  Scale,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import thinkdocParseGif from "@/assets/thinkdoc-parse-demo.gif";
import thinkdocPlaybookPreview from "@/assets/thinkdoc-playbook-preview.png";
import thinkdocLegalPreview from "@/assets/thinkdoc-legal-preview.png";

const ThinkDoc = () => {
  const [activeFunction, setActiveFunction] = useState<number>(0);

  const keyFunctions: Array<{
    title: string;
    icon: typeof BookOpen;
    description: string;
    features: string[];
    preview: string | null;
  }> = [
    {
      title: "Playbook Generation",
      icon: BookOpen,
      description: "Transform messy annotations and legacy contracts into structured playbooks and precedent libraries that drive consistent, faster reviews.",
      features: [
        "Extract key clauses and terms from existing agreements",
        "Define acceptable ranges and fallback positions automatically",
        "Create shareable playbooks for team consistency",
        "Version-controlled playbook management"
      ],
      preview: thinkdocPlaybookPreview
    },
    {
      title: "Review with Playbook",
      icon: FileSearch,
      description: "Review incoming contracts against your established playbooks. ThinkDoc highlights deviations, risks, and suggests negotiation points based on your defined standards.",
      features: [
        "Automatic clause comparison against playbook standards",
        "Risk scoring and priority flagging",
        "Suggested redlines aligned with your positions",
        "One-click application of standard language"
      ],
      preview: null
    },
    {
      title: "Review with Precedents",
      icon: GitCompare,
      description: "Compare new documents against your library of executed agreements. Find how similar clauses were negotiated in past deals and apply winning strategies.",
      features: [
        "Search precedent library by clause type or concept",
        "View historical negotiation outcomes",
        "Apply proven language from successful deals",
        "Track clause evolution across deals"
      ],
      preview: null
    },
    {
      title: "Summarise Redlines",
      icon: ListChecks,
      description: "Generate clear, actionable summaries of all changes between document versions. Perfect for executive briefings and negotiation updates.",
      features: [
        "Plain-language explanation of all modifications",
        "Categorize changes by risk and importance",
        "Export summaries for stakeholder communication",
        "Side-by-side version comparison"
      ],
      preview: null
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-24 md:py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start max-w-7xl mx-auto">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xl md:text-2xl font-serif text-foreground">ThinkDoc</span>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    Document AI
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground mb-8 leading-tight">
                  Let AI read your documents with speed and accuracy
                </h1>
                <div className="flex flex-wrap gap-4">
                  <Link to="/demo">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 py-3 text-base">
                      Contact us
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/word-addin">
                    <Button variant="outline" className="rounded-lg px-6 py-3 text-base">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="space-y-6">
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">ThinkDoc</span> transforms how teams work with documents. 
                  From extracting information and completing forms to drafting and review, it delivers answers 
                  you can trust—grounded in your files with citations and full traceability.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Whether you're dealing with Word documents, PDFs, or scanned files, ThinkDoc ensures your 
                  data is accurately processed and ready for AI-powered analysis across any industry.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Demo GIF Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="rounded-2xl overflow-hidden border border-border/30 shadow-lg">
                <img 
                  src={thinkdocParseGif} 
                  alt="ThinkDoc Demo - Document processing visualization"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Key Functions Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-serif text-foreground mb-4">
                  Key Functions
                </h2>
                <p className="text-muted-foreground/70 max-w-2xl mx-auto font-light text-lg">
                  Powerful document intelligence capabilities for any industry
                </p>
              </div>

              <div className="grid lg:grid-cols-12 gap-8">
                {/* Function Tabs */}
                <div className="lg:col-span-4 space-y-2">
                  {keyFunctions.map((func, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveFunction(index)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-4 ${
                        activeFunction === index
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-background/80 text-foreground border border-border/50"
                      }`}
                    >
                      <func.icon className={`h-5 w-5 ${
                        activeFunction === index ? "text-primary-foreground" : "text-primary"
                      }`} />
                      <span className="font-medium">{func.title}</span>
                    </button>
                  ))}
                </div>

                {/* Function Details */}
                <div className="lg:col-span-8">
                  <div className="bg-background rounded-2xl border border-border/50 p-8 h-full">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        {(() => {
                          const Icon = keyFunctions[activeFunction].icon;
                          return <Icon className="h-6 w-6 text-primary" />;
                        })()}
                      </div>
                      <h3 className="text-2xl font-serif text-foreground">
                        {keyFunctions[activeFunction].title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                      {keyFunctions[activeFunction].description}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {keyFunctions[activeFunction].features.map((feature, index) => (
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

        {/* Word Add-in Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-primary">Microsoft Word Add-in</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                    Work directly in Microsoft Word
                  </h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    ThinkDoc is available as a Microsoft Word Add-in from the Microsoft Marketplace. 
                    Access AI-powered document intelligence without leaving your familiar workflow—review, 
                    analyze, and draft documents directly within Word.
                  </p>
                  <div className="space-y-3 mb-8">
                    {[
                      "One-click installation from Microsoft Marketplace",
                      "Seamless integration with your existing Word workflow",
                      "Real-time AI assistance as you work",
                      "Enterprise-ready security and compliance"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <a 
                    href="https://marketplace.microsoft.com/en-us/product/saas/wa200009343?tab=overview" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 py-3">
                      Get from Microsoft Marketplace
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </div>
                <div className="bg-white rounded-2xl border border-border/30 shadow-lg overflow-hidden">
                  <div className="bg-[#217346] text-white px-4 py-2 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">ThinkDoc - Microsoft Word Add-in</span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center border border-border/50">
                        <div className="text-4xl font-bold text-primary">/</div>
                      </div>
                      <div>
                        <h4 className="text-xl font-serif text-foreground mb-1">ThinkDoc</h4>
                        <p className="text-sm text-muted-foreground">by ThinkSpace AI</p>
                        <div className="flex items-center gap-1 mt-1 text-[#217346]">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">Word</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <Button className="bg-[#0078d4] hover:bg-[#106ebe] text-white rounded px-6 py-2 text-sm">
                        Get it now
                      </Button>
                      <span className="text-sm text-muted-foreground">Save to my list</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Legal Industry Use Case Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Scale className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-primary">Legal Industry</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                    Built for legal document workflows
                  </h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    ThinkDoc understands the complexity of legal documents. It accurately processes 
                    Word document structures with <span className="text-foreground font-medium">high accuracy for track changes, 
                    comments, and highlights</span>—ensuring nothing is lost in translation when your 
                    team reviews contracts, agreements, and legal filings.
                  </p>
                  <div className="space-y-3">
                    {[
                      "Preserve and analyze track changes with full context",
                      "Extract and organize document comments and annotations",
                      "Identify highlighted sections and their significance",
                      "Maintain document formatting integrity throughout processing"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-border/30 shadow-lg">
                  <img 
                    src={thinkdocLegalPreview} 
                    alt="ThinkDoc legal document review with playbook rules"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                Ready to transform document review?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                See ThinkDoc in action with a personalized demo.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/demo">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8 py-3 text-base">
                    Book a Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/word-addin">
                  <Button variant="outline" className="rounded-lg px-8 py-3 text-base">
                    Try Word Add-in
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

export default ThinkDoc;

