import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Scale, TrendingUp, FileText, Database, Search, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const TechIndustrySection = () => {
  const section = useScrollAnimation();

  return (
    <section className="py-32 bg-background relative overflow-hidden" ref={section.ref}>
      {/* Background elements */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[200px]" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className={`text-center mb-20 fade-in-up ${section.isVisible ? 'visible' : ''}`}>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight tracking-tight">
              Built for
              <br />
              <span className="text-muted-foreground">Knowledge Teams</span>
            </h2>
            <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
              Specialized solutions for professionals who demand precision and security.
            </p>
          </div>

          {/* Industry Cards */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Legal */}
            <div className={`group p-10 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all slide-in-left ${section.isVisible ? 'visible' : ''}`}>
              <div className="flex items-start gap-6 mb-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Legal Teams</h3>
                  <p className="text-muted-foreground font-light">
                    Transform legal operations with AI-powered contract analysis and intelligent research.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[
                  { icon: FileText, title: "ThinkDoc", desc: "Contract Review" },
                  { icon: Workflow, title: "Junior", desc: "Document Processing" },
                  { icon: Database, title: "Vault", desc: "Contract Database" },
                  { icon: Search, title: "Research", desc: "Legal Research" }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                    <item.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full border-border/50 hover:border-primary/50 hover-glow" asChild>
                <Link to="/legal">Explore Legal Solutions</Link>
              </Button>
            </div>

            {/* Finance */}
            <div className={`group p-10 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm hover:border-accent/30 transition-all slide-in-right ${section.isVisible ? 'visible' : ''}`}>
              <div className="flex items-start gap-6 mb-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Finance Teams</h3>
                  <p className="text-muted-foreground font-light">
                    Streamline financial operations with intelligent data analysis and automated reporting.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[
                  { icon: Database, title: "Data Integration", desc: "Connect all systems" },
                  { icon: Zap, title: "Auto Reporting", desc: "Instant insights" },
                  { icon: Search, title: "Research", desc: "Market intelligence" },
                  { icon: Workflow, title: "Automation", desc: "Streamline workflows" }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                    <item.icon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full border-border/50 hover:border-accent/50 glow-accent" asChild>
                <Link to="/finance">Explore Finance Solutions</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechIndustrySection;
