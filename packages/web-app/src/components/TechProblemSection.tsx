import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const TechProblemSection = () => {
  const section = useScrollAnimation();

  return (
    <section className="py-24 md:py-32 bg-background relative" ref={section.ref}>
      <div className="container mx-auto px-6 lg:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`fade-in-up ${section.isVisible ? 'visible' : ''}`}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6 leading-tight">
              The Engine for Enterprise Knowledge.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground/70 max-w-3xl mx-auto font-light leading-relaxed">
              ThinkSpace aggregates, structures, and operationalizes your firm's data, enabling comprehensive analysis and actionable insights across a single project or your entire organization.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechProblemSection;