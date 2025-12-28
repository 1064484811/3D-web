
import React, { useEffect, useRef } from 'react';

interface SpaceBackgroundProps {
  velocity: { x: number; y: number };
}

const SpaceBackground: React.FC<SpaceBackgroundProps> = ({ velocity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let flakes: Array<{
      x: number;
      y: number;
      radius: number;
      speedY: number;
      opacity: number;
      swing: number;
      swingSpeed: number;
      angle: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createSnow = () => {
      flakes = [];
      // 创建更丰富的雪花层级，模拟远近景深
      for (let i = 0; i < 250; i++) {
        const radius = Math.random() * 2.5 + 0.5;
        flakes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: radius,
          // 较大的雪花下落稍快，模拟物理重量
          speedY: (radius * 0.4) + Math.random() * 0.5 + 0.3,
          opacity: Math.random() * 0.5 + 0.2,
          swing: Math.random() * 2 + 0.5,
          swingSpeed: Math.random() * 0.02 + 0.01,
          angle: Math.random() * Math.PI * 2
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      flakes.forEach(f => {
        // 纯净飘落逻辑：仅保留自身的水平摆动，移除外部速度（风力）干扰
        f.angle += f.swingSpeed;
        f.x += Math.sin(f.angle) * f.swing * 0.2;
        f.y += f.speedY;

        // 垂直循环：到达底部回到顶部
        if (f.y > canvas.height + 10) {
          f.y = -10;
          f.x = Math.random() * canvas.width;
        }

        // 水平循环：处理摆动可能导致的越界
        if (f.x > canvas.width + 10) {
          f.x = -10;
        } else if (f.x < -10) {
          f.x = canvas.width + 10;
        }

        // 绘制雪花
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    createSnow();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []); // 移除对 velocity 的监听，使雪花完全独立于舞台交互

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 bg-[#020617]"
      style={{ filter: 'blur(0.3px)' }} // 极轻微模糊，增加柔和感
    />
  );
};

export default SpaceBackground;
