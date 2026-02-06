import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Shield, Server, Lock, Eye } from "lucide-react";

const LocalSecuritySection = () => {
  const section = useScrollAnimation();

  const features = [
    {
      icon: Server,
      title: "Run Locally",
      description: "Deploy on your own infrastructure. Your data never leaves your servers.",
    },
    {
      icon: Lock,
      title: "Air-Gapped Option",
      description: "Complete network isolation for the most sensitive environments.",
    },
    {
      icon: Eye,
      title: "Full Visibility",
      description: "Audit logs, access controls, and complete transparency into AI decisions.",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-muted/20 relative" ref={section.ref}>
      <div className="container mx-auto px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className={`text-center mb-16 fade-in-up ${section.isVisible ? 'visible' : ''}`}>
            <div className="inline-flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-foreground/70" />
              <span className="text-sm font-light text-muted-foreground tracking-wide uppercase">Enterprise Security</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-6 leading-tight">
              Built for local-first privacy.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground/70 max-w-2xl mx-auto font-light leading-relaxed">
              Keep your data where it belongs—on your infrastructure. ThinkSpace runs entirely on-premise, ensuring complete control over your sensitive information.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`text-center p-8 rounded-lg border border-border/40 bg-background fade-in-up ${section.isVisible ? 'visible' : ''}`}
                style={{ transitionDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="w-12 h-12 mx-auto mb-6 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-foreground/70" />
                </div>
                <h3 className="text-xl font-serif text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground/70 text-sm leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Trust Badge */}
          <div className={`text-center mt-12 fade-in-up ${section.isVisible ? 'visible' : ''}`} style={{ transitionDelay: '400ms' }}>
            <p className="text-sm text-muted-foreground/60 font-light">
              ISO 27001 Compliant · SOC 2 Type II · GDPR Ready
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocalSecuritySection;