'use client';
import { useEffect, useRef } from 'react';

interface AnimatedBackgroundProps {
  points?: number;
}

export default function AnimatedBackground({ points = 50 }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationId = useRef<number | null>(null);
  const pointsArray = useRef<Array<{
    x: number;
    y: number;
    angle: number;
    radius: number;
    speed: number;
    opacity: number;
    size: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Initialize points
    pointsArray.current = Array.from({ length: points }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      angle: Math.random() * Math.PI * 2,
      radius: 50 + Math.random() * 150, // Radius for circular motion
      speed: 0.005 + Math.random() * 0.02, // Different speeds
      opacity: 0.3 + Math.random() * 0.7,
      size: 2 + Math.random() * 6
    }));

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pointsArray.current.forEach(point => {
        // Update position in circular motion
        point.angle += point.speed;
        
        // Calculate new position based on circular motion
        const centerX = point.x;
        const centerY = point.y;
        const currentX = centerX + Math.cos(point.angle) * point.radius;
        const currentY = centerY + Math.sin(point.angle) * point.radius;

        // Keep points within bounds by resetting if they go out
        if (currentX < 0 || currentX > canvas.width || currentY < 0 || currentY > canvas.height) {
          point.x = Math.random() * canvas.width;
          point.y = Math.random() * canvas.height;
          point.angle = Math.random() * Math.PI * 2;
        }

        // Draw point with golden color
        ctx.beginPath();
        ctx.arc(currentX, currentY, point.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${point.opacity})`; // Golden color
        ctx.fill();
        
        // Add a subtle glow effect
        ctx.beginPath();
        ctx.arc(currentX, currentY, point.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${point.opacity * 0.2})`;
        ctx.fill();
      });

      animationId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [points]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
}