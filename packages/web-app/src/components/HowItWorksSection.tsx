import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { ArrowRight, Scale, Building2, Stethoscope, GraduationCap, ShoppingBag, Landmark } from "lucide-react";

const HowItWorksSection = () => {
  const section = useScrollAnimation();
  const steps = useScrollAnimation();
  const industries = useScrollAnimation();

  const workflowSteps = [
    {
      number: "01",
      title: "Data Sync",
      description: "Real-time synchronization across all your data sources. Keep everything in perfect harmony.",
      features: [
        "Bi-directional sync",
        "Conflict resolution",
        "Offline-first architecture",
        "Delta updates"
      ]
    },
    {
      number: "02",
      title: "Data Structuring",
      description: "Transform unstructured chaos into organized, queryable knowledge graphs.",
      features: [
        "Schema inference",
        "Entity extraction",
        "Relationship mapping",
        "Version control"
      ]
    },
    {
      number: "03",
      title: "Workflows",
      description: "Design and execute complex automation pipelines with visual or code-first approach.",
      features: [
        "Visual builder",
        "Code-first SDK",
        "Event triggers",
        "Parallel execution"
      ]
    }
  ];

  const industryUseCases = [
    {
      icon: Scale,
      industry: "Legal",
      title: "Contract Intelligence",
      description: "Automate contract review, clause extraction, and compliance checking. Reduce review time by 80%.",
      useCases: [
        "M&A due diligence automation",
        "Contract clause comparison",
        "Regulatory compliance monitoring",
        "Case law research & citation"
      ]
    },
    {
      icon: Building2,
      industry: "Finance",
      title: "Financial Analysis",
      description: "Real-time financial data processing, risk assessment, and automated reporting.",
      useCases: [
        "Earnings call analysis",
        "Risk scoring & alerts",
        "Portfolio document sync",
        "Regulatory filing automation"
      ]
    },
    {
      icon: Stethoscope,
      industry: "Healthcare",
      title: "Clinical Intelligence",
      description: "Securely process patient data, automate documentation, and enhance diagnostic workflows.",
      useCases: [
        "Medical record summarization",
        "Clinical trial matching",
        "Treatment protocol search",
        "Insurance claim processing"
      ]
    },
    {
      icon: GraduationCap,
      industry: "Education",
      title: "Learning Systems",
      description: "Personalized learning paths, automated grading, and institutional knowledge management.",
      useCases: [
        "Curriculum content analysis",
        "Student progress tracking",
        "Research paper organization",
        "Administrative automation"
      ]
    },
    {
      icon: ShoppingBag,
      industry: "Retail",
      title: "Commerce Intelligence",
      description: "Inventory optimization, customer insights, and supply chain automation.",
      useCases: [
        "Product catalog management",
        "Customer support automation",
        "Demand forecasting",
        "Supplier document processing"
      ]
    },
    {
      icon: Landmark,
      industry: "Government",
      title: "Public Sector AI",
      description: "Citizen services automation, policy analysis, and secure document management.",
      useCases: [
        "Policy document search",
        "Citizen request routing",
        "Compliance reporting",
        "Inter-agency data sharing"
      ]
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-muted/20 relative overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* How It Works Header */}
          <div className={`mb-16 fade-in-up ${section.isVisible ? 'visible' : ''}`} ref={section.ref}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6 leading-tight">
              Three steps to smarter knowledge
            </h2>
            <p className="text-base md:text-lg text-muted-foreground/70 max-w-2xl font-light">
              A simple workflow that transforms how you capture, organize, and leverage your data.
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-6 mb-24" ref={steps.ref}>
            {workflowSteps.map((step, index) => (
              <div 
                key={index}
                className={`relative p-8 rounded-lg border border-border/40 bg-background scale-in ${steps.isVisible ? 'visible' : ''}`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Step number */}
                <div className="text-sm font-light text-muted-foreground/60 mb-4">{step.number}</div>
                
                {/* Title */}
                <h3 className="text-xl font-serif text-foreground mb-4">{step.title}</h3>
                
                {/* Description */}
                <p className="text-muted-foreground/70 text-sm leading-relaxed mb-6 font-light">
                  {step.description}
                </p>
                
                {/* Features */}
                <ul className="space-y-2">
                  {step.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground/70">
                      <ArrowRight className="w-3 h-3 text-foreground/50 flex-shrink-0" />
                      <span className="font-light">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Industry Use Cases Header */}
          <div className={`mb-12 fade-in-up ${industries.isVisible ? 'visible' : ''}`} ref={industries.ref}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6 leading-tight">
              Built for every industry
            </h2>
            <p className="text-base md:text-lg text-muted-foreground/70 max-w-2xl font-light">
              ThinkSpace adapts to your industry's unique workflows, compliance requirements, and data structures.
            </p>
          </div>

          {/* Industry Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industryUseCases.map((industry, index) => (
              <div 
                key={index}
                className={`group p-8 rounded-lg border border-border/40 bg-background hover:border-border transition-all scale-in ${industries.isVisible ? 'visible' : ''}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Icon & Industry tag */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center group-hover:border-border transition-all">
                    <industry.icon className="w-5 h-5 text-foreground/70" />
                  </div>
                  <span className="text-xs font-light text-muted-foreground/60 uppercase tracking-wider">{industry.industry}</span>
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-serif text-foreground mb-3">{industry.title}</h3>
                
                {/* Description */}
                <p className="text-muted-foreground/70 text-sm leading-relaxed mb-6 font-light">
                  {industry.description}
                </p>
                
                {/* Use cases */}
                <ul className="space-y-2">
                  {industry.useCases.map((useCase, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground/70">
                      <span className="text-foreground/50 mt-0.5">→</span>
                      <span className="font-light">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
