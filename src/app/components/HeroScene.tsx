"use client";

import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import SpaceBackground from "./SpaceBackground";
import MatrixRain from "./MatrixRain";

interface HeroSceneProps {
  isVisible: boolean;
}

const physicsSpringConfig = { damping: 25, stiffness: 100, mass: 0.5 };

// ─── CYBER SOUND SYSTEM ───
const playCyberSound = (type: "hover" | "click" | "init") => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "hover") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.008, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } else if (type === "init") {
      osc.type = "square";
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.setValueAtTime(500, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.012, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "click") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch (e) {}
};

// ─── GLITCH TEXT EFFECT ───
const GlitchText = ({ text, triggered }: { text: string; triggered: boolean }) => {
  const [displayText, setDisplayText] = useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_@#$";
  
  useEffect(() => {
    if (!triggered) {
      setDisplayText(text);
      return;
    }
    let iterations = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text.split("").map((char, index) => {
          if (char === " ") return " ";
          if (index < iterations) return text[index];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join("")
      );
      if (iterations >= text.length) clearInterval(interval);
      iterations += 1 / 2;
    }, 20);
    return () => clearInterval(interval);
  }, [triggered, text]);

  return <>{displayText}</>;
};

// ─── TYPEWRITER EFFECT FROM LEFT TO RIGHT ───
const TypewriterText = ({ text, delay }: { text: string; delay: number }) => {
  const letters = text.split("");
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { delayChildren: delay, staggerChildren: 0.06 } },
  };

  const childVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", damping: 12 } },
  };

  return (
    <motion.span variants={containerVariants} initial="hidden" animate="visible" className="inline-flex justify-center md:justify-start">
      {letters.map((char, index) => (
        <motion.span key={index} variants={childVariants}>{char === " " ? "\u00A0" : char}</motion.span>
      ))}
    </motion.span>
  );
};

export default function HeroScene({ isVisible }: HeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [stage, setStage] = useState<"title" | "main" | "idle">("idle");
  const [time, setTime] = useState("");
  const [mockHeap, setMockHeap] = useState("0.00MB");
  const [isHoveringName, setIsHoveringName] = useState(false);
  
  const [activeMode, setActiveMode] = useState<"home" | "matrix">("home");
  const [slideDirection, setSlideDirection] = useState<"up" | "down">("down");
  const [sysHash, setSysHash] = useState("0x000000"); 

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);

  const rawRotateX = useTransform(mouseY, [-600, 600], [10, -10]);
  const rawRotateY = useTransform(mouseX, [-600, 600], [-10, 10]);
  const rotateX = useSpring(rawRotateX, physicsSpringConfig);
  const rotateY = useSpring(rawRotateY, physicsSpringConfig);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVisible) {
      setStage("title");
      playCyberSound("init");
      timer = setTimeout(() => setStage("main"), 900); 
    } else {
      setStage("idle");
    }
    return () => clearTimeout(timer);
  }, [isVisible]);

  useEffect(() => {
    if (stage === "main") {
      const interval = setInterval(() => {
        setMockHeap(`${(14.2 + Math.random() * 3.1).toFixed(2)}MB`);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === "main" && activeMode === "matrix") {
      const hashInterval = setInterval(() => {
        setSysHash("0x" + Math.random().toString(16).substr(2, 8).toUpperCase());
      }, 150);
      return () => clearInterval(hashInterval);
    }
  }, [stage, activeMode]);

  useEffect(() => {
    const updateClock = () => {
      const options: Intl.DateTimeFormatOptions = { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
      setTime(new Date().toLocaleTimeString("en-US", options));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const card = cardRef.current;
    if (!container || !card) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    mouseX.set(e.clientX - containerRect.left - containerRect.width / 2);
    mouseY.set(e.clientY - containerRect.top - containerRect.height / 2);

    spotlightX.set(e.clientX - cardRect.left);
    spotlightY.set(e.clientY - cardRect.top);
  };

  const handleMouseLeave = () => {
    mouseX.set(0); mouseY.set(0);
    spotlightX.set(0); spotlightY.set(0);
  };

  const handleModeChange = (mode: "home" | "matrix") => {
    if (mode === activeMode) return;
    playCyberSound("click");
    setSlideDirection(mode === "matrix" ? "up" : "down");
    setActiveMode(mode);
  };

  const spotlightStyle = useTransform(
    [spotlightX, spotlightY],
    ([x, y]) => `radial-gradient(180px circle at ${x}px ${y}px, rgba(59, 130, 246, 0.22), transparent 80%)`
  );

  const screenSliderVariants = {
    enter: (direction: "up" | "down") => ({ y: direction === "up" ? "100%" : "-100%", opacity: 0, filter: "blur(15px)" }),
    center: { y: "0%", opacity: 1, filter: "blur(0px)" },
    exit: (direction: "up" | "down") => ({ y: direction === "up" ? "-100%" : "100%", opacity: 0, filter: "blur(15px)" })
  };

  const terminalLineVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`bg-[#000000] select-none transition-all duration-500 ${
        stage === "title" 
          ? "fixed inset-0 w-screen h-screen z-[99999] flex flex-col justify-center items-center" 
          : "relative flex flex-col justify-center items-center px-4 sm:px-6 md:px-12 overflow-hidden w-full min-h-[100dvh] pt-20 pb-28 sm:pt-24 sm:pb-36 lg:py-0 z-20"
      }`}
      style={{ transform: "translateZ(0)" }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AnimatePresence mode="wait">
          {activeMode === "home" ? (
            <motion.div key="space" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0">
              <SpaceBackground />
            </motion.div>
          ) : (
            <motion.div key="matrix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0">
              <MatrixRain />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {stage === "main" && (
        <div className="absolute top-16 sm:top-13 md:top-24 left-1/2 -translate-x-1/2 z-50 flex w-auto max-w-[95%] sm:max-w-none bg-[#030303]/90 backdrop-blur-md border border-neutral-900 p-1 sm:p-1.5 rounded-full shadow-2xl justify-center items-center">
          <button onClick={() => handleModeChange("home")} className={`whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full font-mono text-[7px] sm:text-[8.5px] uppercase tracking-widest transition-all duration-300 cursor-pointer text-center ${activeMode === "home" ? "bg-white text-black font-bold" : "text-neutral-500 hover:text-white"}`}>PROFESSIONAL SYNOPSIS</button>
          <button onClick={() => handleModeChange("matrix")} className={`whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full font-mono text-[7px] sm:text-[8.5px] uppercase tracking-widest transition-all duration-300 cursor-pointer text-center ${activeMode === "matrix" ? "bg-white text-black font-bold" : "text-neutral-500 hover:text-white"}`}>TECHNICAL INFRASTRUCTURE</button>
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto relative flex flex-col items-center justify-center py-4 -mt-4 sm:-mt-7 md:-mt-0">
        <AnimatePresence mode="wait">
          
          {stage === "title" && (
            <motion.div key="hero-loading-title" initial={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(12px)", y: -15 }} transition={{ duration: 0.35, ease: "easeOut" }} className="flex flex-col items-center justify-center text-center font-mono">
              <p className="text-blue-500 text-[10px] tracking-[0.5em] uppercase mb-2 animate-pulse">// MEMORY_STREAM_INITIALIZATION</p>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase font-sans">HOME</h1>
            </motion.div>
          )}

          {stage === "main" && (
            <AnimatePresence mode="wait" custom={slideDirection}>
              {activeMode === "home" ? (
                <motion.div key="home-core-view" custom={slideDirection} variants={screenSliderVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }} style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="w-full flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 md:gap-4 relative z-10 will-change-transform mt-6 md:mt-0">
                  <div className="flex flex-col text-center md:text-left items-center md:items-start font-sans transition-transform duration-300 ease-out order-2 md:order-1 w-full md:max-w-[55%]" style={{ transform: "translateZ(40px)" }}>
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }} className="flex items-center gap-2 text-blue-500 font-mono text-[9px] sm:text-[10px] tracking-[0.3em] uppercase mb-2 sm:mb-3"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />IDENTITY // VERIFIED</motion.div>
                    
                    <h1 onMouseEnter={() => { setIsHoveringName(true); playCyberSound("hover"); }} onMouseLeave={() => setIsHoveringName(false)} className="text-[2rem] sm:text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[0.95] uppercase mb-3 sm:mb-4 cursor-crosshair select-none flex flex-col gap-1" style={{ transformStyle: "preserve-3d" }}>
                      <motion.span initial={{ opacity: 0, filter: "blur(5px)", y: 10 }} animate={{ opacity: 1, filter: "blur(0px)", y: 0 }} transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }} className="block drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" style={{ transform: "translateZ(15px)" }}><GlitchText text="MOHAMED" triggered={isHoveringName} /></motion.span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-300 to-neutral-500 transition-colors duration-300 block text-center md:text-left" style={{ transform: "translateZ(8px)" }}><TypewriterText text="ELATTAR" delay={0.6} /></span>
                    </h1>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                      transition={{ delay: 0.9, duration: 0.4, ease: "easeOut" }} 
                      className="bg-[#030303]/95 backdrop-blur-md border border-neutral-900 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 sm:gap-2 font-mono shadow-2xl mt-1 sm:mt-1 md:mt-4 relative overflow-hidden group w-full max-w-[280px] sm:max-w-[340px] md:max-w-[400px] mx-auto md:mx-0 text-center md:text-left z-30" 
                      style={{ transform: "translateZ(20px)" }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                      <span className="text-[8px] sm:text-[9.5px] font-black text-blue-400 tracking-wider uppercase leading-snug break-words w-full">FULL-STACK DEVELOPER AND ASPIRING SOFTWARE ENGINEER</span>
                      <div className="flex items-center justify-center gap-2 mt-1 md:mt-0 opacity-80">
                         <span className="text-neutral-800 text-xs hidden md:inline">|</span>
                         <span className="text-neutral-500 text-[7.5px] sm:text-[8px] uppercase tracking-widest whitespace-nowrap">SYS_ENG_2026</span>
                      </div>
                    </motion.div>
                  </div>

                  <motion.div ref={cardRef} initial={{ opacity: 0, y: -40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} style={{ transformStyle: "preserve-3d", transform: "translateZ(50px)" }} className="relative w-36 sm:w-40 md:w-60 lg:w-64 aspect-[4/5] flex items-center justify-center cursor-crosshair group will-change-transform order-1 md:order-2 shadow-[0_50px_80px_rgba(0,0,0,0.9)]" onMouseEnter={() => playCyberSound("hover")}>
                    <div className="absolute left-[-25px] sm:left-[-35px] top-1/2 -translate-y-1/2 text-neutral-700 text-[6px] font-mono [writing-mode:vertical-lr] tracking-[0.2em] transition-colors group-hover:text-neutral-400" style={{ transform: "translateZ(30px)" }}>USER_ADDR_4.0</div>
                    <div className="w-full h-full border border-neutral-900 rounded-2xl p-2 bg-black/50 backdrop-blur-md overflow-hidden relative transition-all duration-500 group-hover:border-blue-500/20" style={{ transform: "translateZ(15px)" }}>
                      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 mix-blend-screen" style={{ background: spotlightStyle }} />
                      <img src="/MOHAMED-ELATTAR.PNG" alt="Developer Frame" className="w-full h-full object-cover rounded-xl border border-neutral-950/80 filter grayscale contrast-125 brightness-90 group-hover:grayscale-0 group-hover:scale-[1.03] group-hover:brightness-100 transition-all duration-700 ease-out" />
                      <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-neutral-800 group-hover:border-blue-500/80 transition-colors duration-300" /><div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-neutral-800 group-hover:border-blue-500/80 transition-colors duration-300" />
                    </div>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div key="cyber-matrix-view" custom={slideDirection} variants={screenSliderVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }} className="w-full bg-[#020202]/70 border border-neutral-900/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 lg:p-8 backdrop-blur-xl text-left flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-6 items-center justify-between shadow-[0_0_60px_rgba(0,0,0,0.8)] mt-10 sm:mt-8 md:mt-14 lg:mt-0">
                  
                  <div className="flex-1 w-full flex flex-col gap-2 sm:gap-3 lg:gap-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 sm:pb-2">
                       <span className="text-blue-500 font-mono text-[8px] sm:text-[9px] lg:text-xs uppercase tracking-[0.25em]">// CORE_ENGINEERING_DIRECTIVES</span>
                       <span className="text-neutral-500 font-mono text-[9px] hidden sm:block">{sysHash}</span>
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black text-white uppercase font-sans tracking-tight leading-none">SYSTEM ARCHITECTURE & PROTOCOLS</h3>

                    {/* 💡 تم تعديل النصوص البرمجية لتعكس بناء E-commerce والروتين اللليلي */}
                    <div className="bg-[#050505] border border-neutral-800 p-2.5 sm:p-3 lg:p-4 rounded-xl font-mono text-[7px] sm:text-[7.5px] md:text-[8.5px] lg:text-xs text-neutral-400 space-y-1 sm:space-y-1.5 lg:space-y-2 relative overflow-hidden group shadow-inner min-h-[100px] sm:min-h-[110px] md:min-h-[120px] lg:min-h-[160px]">
                       <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                       <p><span className="text-blue-500 font-bold">root@core:~#</span> ./deploy_infrastructure.sh</p>
                       <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.25 } } }}>
                         <motion.p variants={terminalLineVariants} className="pl-2 text-neutral-600">&gt; Executing microservices for active E-commerce architecture... <span className="text-emerald-400 font-bold">[OK]</span></motion.p>
                         <motion.p variants={terminalLineVariants} className="pl-2">&gt; Optimizing database queries & structuring product schemas... <span className="text-blue-400 font-bold">[SYNCED]</span></motion.p>
                         <motion.p variants={terminalLineVariants} className="pl-2 text-neutral-600">&gt; Deep work mode active: Compiling late-night commits... <span className="text-purple-400 font-bold">[SYSTEM_ROUTINE]</span></motion.p>
                         <motion.p variants={terminalLineVariants} className="pl-2">&gt; Validating strict-type security rules & payment gateways... <span className="text-emerald-400 font-bold">[SECURED]</span></motion.p>
                         <motion.p variants={terminalLineVariants} className="pl-2 text-blue-500 font-bold mt-1 lg:mt-2">&gt; Architecture successfully deployed. Awaiting new connections.</motion.p>
                       </motion.div>
                       <p className="animate-pulse font-black text-white text-xs sm:text-sm">_</p>
                    </div>
                  </div>

                  <div className="w-full md:w-64 lg:w-80 bg-black/80 border border-neutral-900 p-2.5 sm:p-3 lg:p-5 rounded-xl sm:rounded-2xl flex flex-col gap-2 sm:gap-2.5 lg:gap-4 font-mono shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full pointer-events-none" />
                    <span className="text-[7.5px] sm:text-[8px] lg:text-[9px] text-neutral-500 uppercase tracking-widest">// SYSTEM METRICS & ARSENAL</span>

                    <div className="space-y-1.5 sm:space-y-2 lg:space-y-4">
                       {/* 💡 تم تعديل مقاييس الجودة والنسب المئوية بناءً على تعليماتك */}
                       {[
                         { label: "PERFORMANCE (CORE WEB VITALS)", val: 98, color: "bg-blue-500" },
                         { label: "ACCESSIBILITY (A11Y)", val: 100, color: "bg-emerald-500" },
                         { label: "BEST PRACTICES & CLEAN CODE", val: 95, color: "bg-purple-500" },
                         { label: "SEO & METADATA OPTIMIZATION", val: 100, color: "bg-white" }
                       ].map((skill, i) => (
                         <div key={i} className="flex flex-col gap-0.5 lg:gap-1">
                            <div className="flex justify-between text-[7px] sm:text-[7.5px] lg:text-[8.5px] text-neutral-300 font-bold uppercase tracking-wider">
                               <span>{skill.label}</span>
                               <span>{skill.val}%</span>
                            </div>
                            <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
                               <motion.div initial={{ width: 0 }} animate={{ width: `${skill.val}%` }} transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }} className={`h-full ${skill.color}`} />
                            </div>
                         </div>
                       ))}
                    </div>

                    <div className="pt-1.5 sm:pt-2 lg:pt-3 border-t border-neutral-900 flex justify-between items-center">
                       <span className="text-[7px] sm:text-[7.5px] lg:text-[8px] text-neutral-600 uppercase tracking-widest">ACTIVE NODES</span>
                       <div className="flex gap-1 lg:gap-1.5">
                          {[1,2,3,4,5].map(n => (
                             <span key={n} className={`w-1 lg:w-1.5 h-1 lg:h-1.5 rounded-full ${n !== 4 ? "bg-emerald-500 animate-pulse" : "bg-neutral-800"}`} style={{ animationDelay: `${n * 0.2}s` }} />
                          ))}
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </AnimatePresence>
      </div>

      {stage === "main" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="absolute bottom-4 hidden sm:flex w-full max-w-6xl px-6 flex-row items-center justify-between text-[8px] font-mono text-neutral-600 border-t border-neutral-900/20 pt-3 z-30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#020202] border border-neutral-900 px-2 py-0.5 rounded-md shadow-inner cursor-pointer hover:border-neutral-700 transition-colors" onClick={() => playCyberSound("click")}>
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black tracking-widest text-neutral-400 uppercase">SYS_ACTIVE</span>
            </div>
            <span className="tracking-widest hidden lg:inline">HEAP_ALLOC: <span className="text-neutral-400 font-bold">{mockHeap}</span></span>
          </div>
          <div className="bg-[#020202] border border-neutral-900 px-2 py-0.5 rounded-md text-neutral-400 tracking-[0.2em] font-bold uppercase">
            CAIRO // {time || "00:00:00"} // UTC+02
          </div>
        </motion.div>
      )}
    </section>
  );
}