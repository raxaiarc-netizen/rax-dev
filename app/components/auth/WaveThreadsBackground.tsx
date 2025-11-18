import { useEffect, useRef } from 'react';

export function WaveThreadsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const mouseRef = useRef({ x: -1000, y: -1000 });

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

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation parameters
    const lineCount = 40; // Number of wave lines
    const pointsPerLine = 150; // Points along each line
    
    // Create wave lines with mouse interaction
    const animate = () => {
      // Use global time so animation is consistent across pages
      const time = Date.now() * 0.001 * 0.5;

      // Clear with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;
      const mouseRadius = 180; // Larger radius for smoother interaction

      // Draw flowing wave lines
      for (let i = 0; i < lineCount; i++) {
        const yOffset = (canvas.height / 2) + (i - lineCount / 2) * 15;
        const waveHeight = 100;
        const frequency = 0.003;
        const phase = i * 0.1;
        
        ctx.beginPath();
        
        // Varying opacity with subtle animation
        const baseOpacity = 0.15 + (Math.sin(time + phase) * 0.05);
        ctx.strokeStyle = `rgba(180, 180, 180, ${baseOpacity})`;
        ctx.lineWidth = 1.5;

        for (let x = 0; x <= canvas.width; x += canvas.width / pointsPerLine) {
          // Create flowing wave pattern
          const wave1 = Math.sin(x * frequency + time + phase) * waveHeight;
          const wave2 = Math.sin(x * frequency * 2 - time * 0.5 + phase) * (waveHeight * 0.5);
          const wave3 = Math.cos(x * frequency * 0.5 + time * 0.3) * (waveHeight * 0.3);
          
          let y = yOffset + wave1 + wave2 + wave3;

          // Smooth mouse interaction - waves flow away from cursor
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mouseRadius && distance > 0) {
            // Smooth falloff using easing function
            const force = Math.pow(1 - distance / mouseRadius, 2);
            const pushStrength = 40;
            
            // Push perpendicular to the wave (mainly in Y direction)
            const angle = Math.atan2(dy, dx);
            y += Math.sin(angle) * force * pushStrength;
          }

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0" style={{ opacity: 0.8 }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'rgba(0, 0, 0, 0)',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
