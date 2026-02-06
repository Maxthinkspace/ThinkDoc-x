import { useEffect, useRef } from 'react';

const OrbitAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Orbit system
    class Particle {
      angle: number;
      radius: number;
      speed: number;
      size: number;
      opacity: number;
      color: string;

      constructor() {
        this.angle = Math.random() * Math.PI * 2;
        this.radius = 100 + Math.random() * 250;
        this.speed = 0.0005 + Math.random() * 0.001;
        this.size = 2 + Math.random() * 3;
        this.opacity = 0.3 + Math.random() * 0.4;
        this.color = Math.random() > 0.5 ? '59, 130, 246' : '168, 85, 247'; // Blue or Purple
      }

      update() {
        this.angle += this.speed;
      }

      draw(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
        const x = centerX + Math.cos(this.angle) * this.radius;
        const y = centerY + Math.sin(this.angle) * this.radius * 0.4; // Elliptical orbit

        // Solid particle without shadow
        ctx.fillStyle = `rgba(${this.color}, ${this.opacity + 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles
    const particles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw orbit rings (very subtle)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 100 * i, 40 * i, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw and update particles
      particles.forEach(particle => {
        particle.update();
        particle.draw(ctx, centerX, centerY);
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
};

export default OrbitAnimation;
