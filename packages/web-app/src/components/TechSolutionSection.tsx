import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Bot, Database, Workflow, Link, Layers, Code } from "lucide-react";

const TechSolutionSection = () => {
  const section = useScrollAnimation();
  const features = useScrollAnimation();

  const modules = [
    {
      icon: Bot,
      title: "Assistant",
      description: "Intelligent AI companion that understands your context and helps navigate your knowledge.",
    },
    {
      icon: Database,
      title: "Knowledge Base",
      description: "Centralized repository for all your structured and unstructured data with semantic search.",
    },
    {
      icon: Workflow,
      title: "Agent",
      description: "Autonomous agents that execute complex tasks across your connected systems.",
    },
    {
      icon: Link,
      title: "Connector",
      description: "Pre-built integrations for 100+ data sources. Connect once, sync forever.",
    },
    {
      icon: Layers,
      title: "Model Hub",
      description: "Access and deploy ML models for classification, extraction, and generation.",
    },
    {
      icon: Code,
      title: "APIs",
      description: "RESTful and GraphQL endpoints for seamless integration with your existing stack.",
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-background relative" ref={section.ref}>
      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className={`mb-16 fade-in-up ${section.isVisible ? 'visible' : ''}`}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6 leading-tight">
              The Enterprise AI Operating System
            </h2>
            <p className="text-base md:text-lg text-muted-foreground/70 max-w-2xl font-light">
              Build, deploy, and scale AI-powered solutions with our modular platform.
            </p>
          </div>

          {/* Module Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" ref={features.ref}>
            {modules.map((module, index) => (
              <div 
                key={index}
                className={`group p-8 rounded-lg border border-border/40 bg-muted/20 hover:border-border hover:bg-muted/30 transition-all scale-in ${features.isVisible ? 'visible' : ''}`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg border border-border/50 bg-background flex items-center justify-center mb-6 group-hover:border-border transition-all">
                  <module.icon className="w-6 h-6 text-foreground/70" />
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-serif text-foreground mb-3">{module.title}</h3>
                
                {/* Description */}
                <p className="text-muted-foreground/70 text-sm leading-relaxed font-light">
                  {module.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechSolutionSection;