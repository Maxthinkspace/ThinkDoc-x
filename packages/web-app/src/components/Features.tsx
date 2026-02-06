import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Zap, Shield, Sparkles, TrendingUp, Users, Globe } from "lucide-react";

const Features = () => {
  const section = useScrollAnimation();
  const stats = useScrollAnimation();
  const benefits = useScrollAnimation();

  return (
    <section id="features" className="py-32 bg-background relative overflow-hidden" ref={section.ref}>
      <div className="container mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className={`text-center mb-20 fade-in-up ${section.isVisible ? 'visible' : ''}`}>
          <h2 className="text-5xl md:text-7xl font-normal text-foreground mb-6 leading-tight">
            Why ThinkSpace?
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            The enterprise AI platform that transforms how teams work with knowledge
          </p>
        </div>

        {/* Key Benefits Grid */}
        <div className="max-w-6xl mx-auto mb-24" ref={benefits.ref}>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Lightning Fast */}
            <div className={`group border border-border/50 rounded-2xl p-8 bg-background hover:shadow-soft transition-all scale-in ${benefits.isVisible ? 'visible' : ''}`}>
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                Get answers in seconds, not hours. Our AI-powered search finds exactly what you need across all your enterprise data.
              </p>
            </div>

            {/* Enterprise Secure */}
            <div className={`group border border-border/50 rounded-2xl p-8 bg-background hover:shadow-soft transition-all scale-in delay-100 ${benefits.isVisible ? 'visible' : ''}`}>
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-3">Enterprise Secure</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                ISO 27001 certified with role-based access control. Your data stays protected and compliant at all times.
              </p>
            </div>

            {/* Beautifully Simple */}
            <div className={`group border border-border/50 rounded-2xl p-8 bg-background hover:shadow-soft transition-all scale-in delay-200 ${benefits.isVisible ? 'visible' : ''}`}>
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-3">Beautifully Simple</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                No training required. Intuitive interface that feels natural from day one. Just ask, and get intelligent answers.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="max-w-5xl mx-auto" ref={stats.ref}>
          <div className="border border-border/50 rounded-2xl p-12 bg-muted/20">
            <div className="grid md:grid-cols-3 gap-12 text-center">
              <div className={`fade-in-up ${stats.isVisible ? 'visible' : ''}`}>
                <div className="flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-primary mr-2" />
                </div>
                <div className="text-5xl md:text-6xl font-light text-foreground mb-3">500+</div>
                <div className="text-muted-foreground font-light">Leading teams trust us</div>
              </div>
              <div className={`fade-in-up delay-200 ${stats.isVisible ? 'visible' : ''}`}>
                <div className="flex items-center justify-center mb-3">
                  <Globe className="w-6 h-6 text-primary mr-2" />
                </div>
                <div className="text-5xl md:text-6xl font-light text-foreground mb-3">10M+</div>
                <div className="text-muted-foreground font-light">Documents processed securely</div>  
              </div>
              <div className={`fade-in-up delay-400 ${stats.isVisible ? 'visible' : ''}`}>
                <div className="flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-primary mr-2" />
                </div>
                <div className="text-5xl md:text-6xl font-light text-foreground mb-3">85%</div>
                <div className="text-muted-foreground font-light">Average time saved</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;