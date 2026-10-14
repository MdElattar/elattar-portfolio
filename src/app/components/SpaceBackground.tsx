"use client";

import { useEffect, useRef } from "react";

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let resizeTimeout: NodeJS.Timeout;

    // تريكة الـ HD Rendering: ضبط الأبعاد بناءً على كثافة بكسلات الشاشة (DPR)
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const setupCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    setupCanvas();

    const numStars = 150; // عدد نجوم مثالي للدمج مع الـ Micro Grid الجديد
    const stars: Array<{ x: number; y: number; z: number; color: string; speedOffset: number }> = [];

    // بناء مصفوفة النجوم الأولية
    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * width - width / 2,
          y: Math.random() * height - height / 2,
          z: Math.random() * width,
          color: Math.random() > 0.88 ? "#38bdf8" : Math.random() > 0.95 ? "#818cf8" : "#ffffff",
          speedOffset: 0.5 + Math.random() * 1.2, // تباين سرعات النجوم لعمق الـ 3D
        });
      }
    };

    initStars();

    // متغيرات الحركة الفيزيائية للماوس والسرعات الديناميكية
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let currentSpeed = 0.8;
    let targetSpeed = 0.8;

    const handleMouseMoveGlobal = (e: MouseEvent) => {
      const dx = e.clientX - width / 2;
      const dy = e.clientY - height / 2;
      targetMouseX = dx * 0.04;
      targetMouseY = dy * 0.04;

      // تريكة الـ Warp Speed: زيادة سرعة النجوم مؤقتاً عند تسارع حركة الماوس بعيداً عن المركز
      const distance = Math.sqrt(dx * dx + dy * dy);
      targetSpeed = 0.8 + (distance / width) * 2.5;
    };

    window.addEventListener("mousemove", handleMouseMoveGlobal);

    // تريكة الـ Debounced Resize لمنع استهلاك المعالج أثناء تغيير حجم الشاشة
    const resizeContainer = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setupCanvas();
        initStars();
      }, 150);
    };
    window.addEventListener("resize", resizeContainer);

    // الـ Render Loop الرئيسي عالي الكفاءة
    const render = () => {
      // تفريغ الخلفية بلون أسود داكن ونقي
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // تليين حركة الماوس والسرعة بنظام الـ Linear Interpolation (Lerp)
      currentMouseX += (targetMouseX - currentMouseX) * 0.06;
      currentMouseY += (targetMouseY - currentMouseY) * 0.06;
      currentSpeed += (targetSpeed - currentSpeed) * 0.04;

      // إرجاع السرعة تدريجياً للوضع الهادئ الافتراضي
      targetSpeed += (0.8 - targetSpeed) * 0.02;

      ctx.save();
      // تحريك نقطة الصفر لمنتصف الشاشة مع إضافة إزاحة تتبع الماوس الانسيابية
      ctx.translate(width / 2 + currentMouseX, height / 2 + currentMouseY);

      for (let i = 0; i < numStars; i++) {
        const star = stars[i];
        
        // تعديل العمق بناءً على السرعة اللحظية والـ Offset الخاص بالنجم
        star.z -= currentSpeed * star.speedOffset;

        // إعادة تدوير النجم وإطلاقه من الخلفية فور اقترابه الشديد من الكاميرا
        if (star.z <= 0) {
          star.z = width;
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
        }

        // حسابات إسقاط الأبعاد الثلاثية على مساحة الـ 2D Canvas
        const k = 350 / star.z;
        const px = star.x * k;
        const py = star.y * k;

        // الرندر يتم فقط للنجوم الواقعة داخل حدود الرؤية
        if (px >= -width / 2 && px <= width / 2 && py >= -height / 2 && py <= height / 2) {
          const rawSize = (1 - star.z / width) * 2.8;
          const size = Math.max(0.2, rawSize);
          
          // تدرج شفافية ذكي: النجوم البعيدة تكون خافتة وتتوهج كلما اقتربت
          const alpha = Math.max(0, (1 - star.z / width) * 0.85);

          ctx.beginPath();
          ctx.fillStyle = star.color;
          ctx.globalAlpha = alpha;
          
          // رسم النجم كدائرة دقيقة جداً وحادة
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Memory Leak Cleanup Guard
    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimeout);
      window.removeEventListener("mousemove", handleMouseMoveGlobal);
      window.removeEventListener("resize", resizeContainer);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0 select-none" 
    />
  );
}