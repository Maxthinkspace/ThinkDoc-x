import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import TypewriterText from "./TypewriterText";
import { ArrowRight } from "lucide-react";

const TechHero = () => {
  const [email, setEmail] = useState("");

  const industries = [
    "with your tools",
    "for you",
    "for leaders",
    "for legal",
    "for CFOs",
    "for sales",
    "for builders",
    "in real time",
    "for product",
    "across clouds",
    "for retail",
    "for HR",
    "reliably",
    "securely",
    "at scale",
    "for users",
    "for marketing",
    "for your team",
    "for CIOs",
    "faster",
    "intelligently"
  ];

  return (
    <section className="min-h-[85vh] flex items-center justify-center bg-background relative">
      {/* Subtle border decoration */}
      <div className="absolute inset-x-8 top-8 bottom-8 border border-border/40 rounded-lg pointer-events-none" />
      
      {/* Content */}
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <div className="space-y-6 mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight tracking-tight">
              Enterprise AI that works
              <br />
              <span className="inline-block min-w-[200px]">
                <TypewriterText 
                  phrases={industries}
                  typingSpeed={80}
                  deletingSpeed={40}
                  pauseDuration={2500}
                />
              </span>
            </h1>
          </div>

          {/* Subheadline */}
          <p className="text-base md:text-lg text-muted-foreground/70 max-w-2xl mx-auto mb-10 font-sans font-light tracking-wide">
            ThinkSpace connects with your firm's data to transform knowledge into structured formats for comprehensive analysis and intelligent workflows.
          </p>

          {/* Email CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="What's your work email?"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            <Button 
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-3 rounded-lg transition-all font-sans flex items-center gap-2"
              asChild
            >
              <a href="/demo">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechHero;
