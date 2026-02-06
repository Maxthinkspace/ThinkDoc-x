import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const TimeWheelAnimation = () => {
  const [isZooming, setIsZooming] = useState(false);
  const navigate = useNavigate();

  const handleWheelClick = () => {
    setIsZooming(true);
    setTimeout(() => {
      navigate("/home");
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center overflow-hidden">
      <div 
        className={`relative cursor-pointer transition-all duration-1800 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
          isZooming ? "scale-[20] opacity-0" : "scale-100 hover:scale-105"
        }`}
        onClick={handleWheelClick}
      >
        {/* Background wheel 1 - rotating clockwise */}
        <div className="absolute inset-4 w-56 h-56 border border-foreground/20 rounded-full animate-spin" 
             style={{ animationDuration: "25s" }} />
        
        {/* Background wheel 2 - rotating counter-clockwise */}
        <div className="absolute inset-8 w-48 h-48 border border-foreground/30 rounded-full animate-spin" 
             style={{ animationDuration: "20s", animationDirection: "reverse" }} />

        {/* Minimalist outer ring */}
        <div className="absolute inset-0 w-64 h-64 border border-foreground/10 rounded-full animate-spin" 
             style={{ animationDuration: "30s" }} />

        {/* Main time wheel - transparent design */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="w-full h-full animate-spin" viewBox="0 0 256 256" style={{ 
            transformOrigin: "128px 128px", 
            animationDuration: "12s",
            animationTimingFunction: "linear"
          }}>
            {/* Clean hour markers - more transparent */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30) * (Math.PI / 180);
              const x1 = 128 + Math.cos(angle) * 110;
              const y1 = 128 + Math.sin(angle) * 110;
              const x2 = 128 + Math.cos(angle) * (i % 3 === 0 ? 95 : 100);
              const y2 = 128 + Math.sin(angle) * (i % 3 === 0 ? 95 : 100);
              
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={i % 3 === 0 ? "2" : "1"}
                  opacity={0.3}
                />
              );
            })}

            {/* Center dot - more transparent */}
            <circle cx="128" cy="128" r="2" fill="hsl(var(--foreground))" opacity="0.4" />
          </svg>
        </div>

        {/* ThinkSpace text positioned at bottom of wheel */}
        <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center pointer-events-none transition-opacity duration-300 ${
          isZooming ? "opacity-0" : "opacity-100"
        }`}>
          <h1 className="text-3xl font-extralight text-foreground mb-1 tracking-wide">
            ThinkSpace
          </h1>
          <p className="text-xs text-muted-foreground opacity-60 font-light tracking-widest uppercase">
            The Future
          </p>
        </div>

        {/* Subtle glow effect */}
        <div className="absolute inset-8 w-48 h-48 bg-gradient-radial from-foreground/5 to-transparent rounded-full pointer-events-none" />
      </div>
    </div>
  );
};