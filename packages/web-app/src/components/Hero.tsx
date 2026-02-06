import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import TypewriterText from "./TypewriterText";
import OrbitAnimation from "./OrbitAnimation";

interface HeroProps {
  version?: 'main' | 'legal' | 'finance';
}

const Hero = ({ version = 'main' }: HeroProps) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    "holidays",
    "reliably",
    "securely",
    "at scale",
    "for users",
    "overtime",
    "for marketing",
    "for your team",
    "for CIOs",
    "weekends",
    "faster",
    "intelligently"
  ];

  return (
    <section className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Orbit Animation Background */}
      <OrbitAnimation />
      
      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background pointer-events-none"
        style={{ transform: `translateY(${scrollY * 0.05}px)` }}
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Main Headline with Typewriter */}
          <div className="space-y-4 fade-in-up visible">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-foreground leading-[1.1] tracking-tight">
              Enterprise AI that works
            </h1>
            <div className="text-4xl md:text-5xl lg:text-6xl font-normal bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent min-h-[1.2em]">
              <TypewriterText 
                phrases={industries}
                typingSpeed={80}
                deletingSpeed={40}
                pauseDuration={2500}
              />
            </div>
          </div>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground font-light max-w-3xl mx-auto fade-in visible delay-300 pt-2">
            The operating system for knowledge work.
          </p>

          {/* CTA Button */}
          <div className="scale-in visible delay-400 pt-4">
            <Button 
              size="lg"
              className="bg-foreground hover:bg-foreground/90 text-background px-12 py-7 text-lg rounded-full transition-smooth shadow-soft hover:shadow-medium font-normal"
              asChild
            >
              <a href="/demo">Get Started</a>
            </Button>
          </div>

          {/* Trust Line */}
          <p className="text-sm text-muted-foreground font-light fade-in visible delay-500 pt-12">
            Trusted by leading teams worldwide
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;