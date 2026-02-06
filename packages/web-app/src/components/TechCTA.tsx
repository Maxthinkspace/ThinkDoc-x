import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const TechCTA = () => {
  const section = useScrollAnimation();

  return (
    <section className="py-24 md:py-32 bg-background relative" ref={section.ref}>
      {/* Subtle border decoration */}
      <div className="absolute inset-x-8 top-8 bottom-8 border border-border/40 rounded-lg pointer-events-none" />

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`fade-in-up ${section.isVisible ? 'visible' : ''}`}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6 leading-tight">
              Ready to transform your enterprise?
            </h2>
            
            <p className="text-base md:text-lg text-muted-foreground/70 max-w-2xl mx-auto mb-10 font-light">
              Join leading organizations using ThinkSpace to unlock the full potential of their enterprise data.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                className="bg-primary hover:bg-primary-hover text-primary-foreground px-8 py-6 rounded-lg transition-all font-sans flex items-center gap-2"
                asChild
              >
                <a href="/demo">
                  Request Demo
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-border hover:border-foreground/30 px-8 py-6 rounded-lg transition-all font-sans"
                asChild
              >
                <a href="/pricing">View Pricing</a>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default TechCTA;
