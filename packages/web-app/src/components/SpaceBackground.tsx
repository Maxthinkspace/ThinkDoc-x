const SpaceBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Floating abstract shapes */}
      <div className="absolute top-20 left-10 w-64 h-64 opacity-20">
        <svg viewBox="0 0 200 200" className="animate-float-slow">
          <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.5" />
        </svg>
      </div>

      <div className="absolute top-40 right-20 w-48 h-48 opacity-15 animate-float" style={{ animationDelay: '2s' }}>
        <svg viewBox="0 0 200 200">
          <path 
            d="M100 20 L180 100 L100 180 L20 100 Z" 
            fill="none" 
            stroke="hsl(var(--accent))" 
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="absolute bottom-32 left-1/4 w-56 h-56 opacity-10 animate-float-slow" style={{ animationDelay: '4s' }}>
        <svg viewBox="0 0 200 200">
          <polygon 
            points="100,20 180,180 20,180" 
            fill="none" 
            stroke="hsl(var(--muted-foreground))" 
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="absolute top-1/3 left-1/3 w-72 h-72 opacity-10 animate-pulse-glow">
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="hsl(var(--primary) / 0.05)" />
          <circle cx="100" cy="100" r="70" fill="hsl(var(--accent) / 0.05)" />
          <circle cx="100" cy="100" r="50" fill="hsl(var(--primary) / 0.05)" />
        </svg>
      </div>

      {/* Dots grid pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="hsl(var(--muted-foreground))" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-primary/40 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 5}s`,
          }}
        />
      ))}

      {/* Gradient orbs */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-tr from-accent/10 to-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
    </div>
  );
};

export default SpaceBackground;
