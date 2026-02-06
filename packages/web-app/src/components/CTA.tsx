import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";

const CTA = () => {
  const section = useScrollAnimation();

  return (
    <section className="py-32 bg-muted/10 relative overflow-hidden" ref={section.ref}>
      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA Card */}
          <div className="border border-border/50 rounded-2xl p-12 md:p-16 bg-background text-center">
            <div className={`fade-in-up ${section.isVisible ? 'visible' : ''}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Transform Your Enterprise</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-normal text-foreground mb-6 leading-tight">
                Ready to build your
                <br />
                <span className="text-muted-foreground">AI Operating System?</span>
              </h2>
              
              <p className="text-lg text-muted-foreground font-light mb-12 max-w-2xl mx-auto leading-relaxed">
                See how ThinkSpace can transform your team's productivity. 
                Book a personalized demo with our enterprise AI specialists.
              </p>
            </div>
            
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 scale-in delay-200 ${section.isVisible ? 'visible' : ''}`}>
              <Button 
                size="lg"
                className="bg-foreground hover:bg-foreground/90 text-background px-12 py-7 text-lg rounded-full transition-smooth shadow-soft hover:shadow-medium group font-normal"
                asChild
              >
                <a href="/demo" className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Book a Demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              
              <Button 
                variant="outline"
                className="px-10 py-6 text-lg rounded-full transition-smooth hover-lift"
                asChild
              >
                <a href="/pricing">View Pricing</a>
              </Button>
            </div>

            <div className={`flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground font-light fade-in delay-400 ${section.isVisible ? 'visible' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>30-minute personalized demo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Custom implementation plan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;