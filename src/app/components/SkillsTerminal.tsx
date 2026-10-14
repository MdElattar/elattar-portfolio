"use client";

import { useState, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import SpaceBackground from "./SpaceBackground";

interface TechItem {
  name: string;
  icon: string;
  category: "frontend" | "backend" | "database" | "tools";
  color: string;
  bgGlow: string;
  statusText: string;
  layer: string;        
  protocol: string;     
  metrics: string;      
}

interface SkillsTerminalProps {
  isVisible: boolean;
}

const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };
const cardSpringConfig = { damping: 15, stiffness: 120 };

// ─── SAFE WEB AUDIO SYNTHESIS (NO AUDIO_CONTEXT BLOCKING) ───
const playCyberSound = (type: "hover" | "click" | "filter") => {
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
    } else if (type === "filter") {
      osc.type = "square";
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.setValueAtTime(850, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    }

    setTimeout(() => {
      if (ctx.state !== "closed") {
        ctx.close().catch(() => {});
      }
    }, 100);
  } catch (e) {}
};

// ─── DECRYPTING GLITCH TEXT EFFECT ───
const GlitchText = memo(({ text, triggered }: { text: string; triggered: boolean }) => {
  const [displayText, setDisplayText] = useState(text || "");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_@#$";
  
  useEffect(() => {
    if (!triggered) {
      setDisplayText(text || "");
      return;
    }
    
    let iterations = 0;
    const interval = setInterval(() => {
      if (!text) return;
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iterations) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      
      if (iterations >= text.length) clearInterval(interval);
      iterations += 0.5;
    }, 25);
    
    return () => clearInterval(interval);
  }, [triggered, text]);

  return <>{displayText}</>;
});
GlitchText.displayName = "GlitchText";

// ─── MICRO SKILL CARD WITH 3D HOVER NEON EFFECTS ───
const SkillCard = memo(({ tech }: { tech: TechItem }) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), cardSpringConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), cardSpringConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    x.set(mouseX / rect.width);
    y.set(mouseY / rect.height);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    playCyberSound("hover");
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  if (!tech) return null;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered ? `perspective(1000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg)` : "perspective(1000px) rotateX(0deg) rotateY(0deg)",
        transformStyle: "preserve-3d",
        boxShadow: isHovered ? `inset 0 0 20px ${tech.color}0A, 0 12px 35px rgba(0,0,0,0.85)` : "none",
        borderColor: isHovered ? `${tech.color}40` : "",
      }}
      className="border border-neutral-900 bg-neutral-950/50 p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-between transition-all duration-300 group relative cursor-pointer overflow-hidden text-center h-[4.5rem] sm:h-20 md:h-24 select-none will-change-transform rounded-sm w-full"
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% -20%, ${tech.color}18, transparent 75%)` }}
      />

      <div 
        className="absolute top-0 left-0 right-0 h-[1.5px] transition-all duration-500 scale-x-0 group-hover:scale-x-100 origin-center"
        style={{ background: `linear-gradient(90deg, transparent, ${tech.color}, transparent)` }}
      />

      <div
        className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-[4px] sm:rounded-md md:rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-[10px] sm:text-base md:text-lg font-mono transition-all duration-300 relative mt-0.5 sm:mt-0 flex-shrink-0"
        style={{
          color: isHovered ? tech.color : "#555555",
          borderColor: isHovered ? `${tech.color}60` : "",
          boxShadow: isHovered ? `0 0 25px ${tech.color}25, inset 0 0 10px ${tech.color}15` : "none",
          transform: isHovered ? "scale(1.1) translateY(-2px) translateZ(25px)" : "scale(1)",
        }}
      >
        <span className="relative z-10">{tech.icon}</span>
        {isHovered && (
          <span className="absolute inset-0 rounded-lg animate-ping opacity-20 pointer-events-none" style={{ backgroundColor: tech.color }} />
        )}
      </div>

      <div className="flex flex-col items-center gap-0 w-full overflow-hidden" style={{ transform: "translateZ(12px)" }}>
        <span
          className="text-[5px] sm:text-[7.5px] md:text-[8.5px] font-mono tracking-wider uppercase font-black transition-colors duration-300 truncate w-full px-1"
          style={{ color: isHovered ? "#ffffff" : "#71717a" }}
        >
          <GlitchText text={tech.name} triggered={isHovered} />
        </span>
        
        <div className="h-2 sm:h-3 flex items-center justify-center overflow-hidden w-full mt-0.5">
          <AnimatePresence mode="wait">
            {isHovered ? (
              <motion.span 
                key="status"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[3.5px] sm:text-[5px] md:text-[6.5px] font-mono tracking-tight uppercase font-black truncate w-full px-0.5"
                style={{ color: tech.color }}
              >
                {tech.statusText}
              </motion.span>
            ) : (
              <span key="layer" className="text-[3.5px] sm:text-[5px] md:text-[6.5px] font-mono text-neutral-600 tracking-widest uppercase truncate w-full px-0.5">
                {tech.layer}
              </span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full flex justify-between px-0.5 text-[3.5px] sm:text-[4.5px] md:text-[5.5px] font-mono text-neutral-600 group-hover:text-neutral-400 transition-colors duration-300" style={{ transform: "translateZ(6px)" }}>
        <span className="truncate max-w-[45%] text-left">{tech.protocol}</span>
        <span className="truncate max-w-[45%] text-right">{tech.metrics}</span>
      </div>

      <div className="absolute top-1 left-1 w-1 h-1 border-t border-l border-neutral-800 transition-colors group-hover:border-neutral-600" />
      <div className="absolute bottom-1 right-1 w-1 h-1 border-b border-r border-neutral-800 transition-colors group-hover:border-neutral-600" />
    </div>
  );
});
SkillCard.displayName = "SkillCard";

// ─── MAIN SKILLS TERMINAL COMPONENT ───
export default function SkillsTerminal({ isVisible }: SkillsTerminalProps) {
  const [stage, setStage] = useState<"title" | "grid" | "idle">("idle");
  const [activeFilter, setActiveFilter] = useState<"all" | "frontend" | "backend" | "database" | "tools">("all");
  const [mockHeap, setMockHeap] = useState("12.24MB");
  const [systemLog, setSystemLog] = useState("SYS_STATUS: OPERATIONAL");
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [mounted, setMounted] = useState(false);

  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(rawMouseY, [-400, 400], [2, -2]), springConfig);
  const rotateY = useSpring(useTransform(rawMouseX, [-400, 400], [-2, 2]), springConfig);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVisible) {
      setStage("title");
      timer = setTimeout(() => {
        setStage("grid");
      }, 900);
    } else {
      setStage("idle");
    }
    return () => clearTimeout(timer);
  }, [isVisible]);

  useEffect(() => {
    if (stage === "grid") {
      const interval = setInterval(() => {
        const usage = (11.45 + Math.random() * 2.2).toFixed(2);
        setMockHeap(`${usage}MB`);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rawMouseX.set(e.clientX - rect.left - rect.width / 2);
    rawMouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    rawMouseX.set(0);
    rawMouseY.set(0);
  };

  const handleFilterClick = (cat: typeof activeFilter, label: string) => {
    setActiveFilter(cat);
    playCyberSound("filter");
    
    setSystemLog(`RECONFIGURING MATRIX -> [${label.toUpperCase()}]`);
    const timer = setTimeout(() => {
      setSystemLog("SYS_STATUS: OPERATIONAL");
    }, 1200);
    return () => clearTimeout(timer);
  };

  const techStack: TechItem[] = [
    { name: "JavaScript", icon: "JS", category: "frontend", color: "#F7DF1E", bgGlow: "rgba(247,223,30,0.01)", statusText: "ENGINE: ES6_V8", layer: "LANG_CORE", protocol: "ECMASCRIPT", metrics: "ASYNC_READY" },
    { name: "ECMAScript 6+", icon: "ES6", category: "frontend", color: "#F7DF1E", bgGlow: "rgba(247,223,30,0.01)", statusText: "ENGINE: ES6_V8", layer: "LANG_CORE", protocol: "TC39_SPEC", metrics: "MODERN_JS" },
    { name: "React.js", icon: "⚛", category: "frontend", color: "#61DAFB", bgGlow: "rgba(97,218,251,0.01)", statusText: "DOM: FIBER", layer: "UI_VIEW", protocol: "HYDRATION", metrics: "60_FPS_VDOM" },
    { name: "Vite", icon: "⚡", category: "frontend", color: "#646CFF", bgGlow: "rgba(100,108,255,0.01)", statusText: "BUNDLER: ESM_HMR", layer: "DEV_BUILD", protocol: "ROLLUP_PROD", metrics: "HMR: <150ms" },
    { name: "Firebase", icon: "🔥", category: "database", color: "#FFCA28", bgGlow: "rgba(255,202,40,0.01)", statusText: "BAAS: FIRESTORE", layer: "CLOUD_INTEG", protocol: "WEBSOCKET", metrics: "RTT: <30ms" },
    { name: "Tailwind CSS", icon: "🍃", category: "frontend", color: "#38BDF8", bgGlow: "rgba(56,189,248,0.01)", statusText: "CSS: JIT_COMPILED", layer: "UI_STYLE", protocol: "POST_CSS", metrics: "CLEAN_DOM" },
    { name: "Node.js", icon: "⬢", category: "backend", color: "#339933", bgGlow: "rgba(51,153,51,0.01)", statusText: "RUNTIME: LIBUV", layer: "SERVER_ENV", protocol: "V8_ISOLATE", metrics: "NON_BLOCKING" },
    { name: "Express.js", icon: "EX", category: "backend", color: "#FFFFFF", bgGlow: "rgba(255,255,255,0.02)", statusText: "ROUTER: PIPELINE", layer: "REST_API", protocol: "HTTP/1.1-2", metrics: "STATELESS" },
    { name: "MongoDB", icon: "🗄️", category: "database", color: "#47A248", bgGlow: "rgba(71,162,72,0.01)", statusText: "DB: NO_SQL_BSON", layer: "PERSISTENCE", protocol: "MONGO_WIRE", metrics: "POOL: ACTIVE" },
    { name: "Mongoose", icon: "🐱", category: "database", color: "#880000", bgGlow: "rgba(136,0,0,0.01)", statusText: "ODM: VALIDATOR_OK", layer: "DATA_MODEL", protocol: "DRIVER_DRV", metrics: "STABLE_CAST" },
    { name: "JWT Auth", icon: "🔑", category: "backend", color: "#00FFCC", bgGlow: "rgba(0,255,204,0.01)", statusText: "CRYPT: HMAC_SHA256", layer: "SECURITY", protocol: "BEARER_TOK", metrics: "STATELESS" },
    { name: "AJAX", icon: "🔄", category: "frontend", color: "#007ACC", bgGlow: "rgba(0,122,204,0.01)", statusText: "ASYNC: XHR_STREAM", layer: "DATA_STREAM", protocol: "FETCH_HTTP", metrics: "LIVE_LOAD" },
    { name: "JSON API", icon: "{ }", category: "frontend", color: "#FF6C37", bgGlow: "rgba(255,108,55,0.01)", statusText: "PARSE: SERIALIZE", layer: "DATA_INTER", protocol: "REST_JSON", metrics: "DATA_EXCH" },
    { name: "Git", icon: "⌥", category: "tools", color: "#F05032", bgGlow: "rgba(240,80,50,0.01)", statusText: "VCS: TREE_TRACKED", layer: "VERSION_CTRL", protocol: "FS_OBJECTS", metrics: "HEAD->MAIN" },
    { name: "GitHub", icon: "🐙", category: "tools", color: "#AF52DE", bgGlow: "rgba(175,82,222,0.01)", statusText: "REMOTE: REDUNDANCY", layer: "CODE_CLOUD", protocol: "HTTPS/SSH", metrics: "HOOKS: OK" }
  ];

  const filteredTech = techStack.filter(tech => activeFilter === "all" || tech.category === activeFilter);

  const gridContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03
      }
    }
  };

  return (
    <section
      ref={containerRef}
      id="skills"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`bg-[#000000] px-3 sm:px-6 md:px-8 select-none transition-all duration-500 overflow-hidden relative flex flex-col justify-center items-center w-full min-h-[100dvh] pt-16 pb-28 md:pt-20 md:pb-32`}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <SpaceBackground />
      </div>

      {/* Preloader matching Home and Projects preloader exactly */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {stage === "title" && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(20px)", y: -20 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              style={{ zIndex: 2147483647 }} 
              className="fixed inset-0 bg-[#000000] z-[9999999] flex flex-col items-center justify-center w-screen h-screen pointer-events-auto"
            >
              <SpaceBackground />
              <motion.div
                initial={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(12px)", y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col items-center justify-center text-center font-mono"
              >
                <p className="text-blue-500 text-[10px] tracking-[0.5em] uppercase mb-2 animate-pulse">// MEMORY_STREAM_INITIALIZATION</p>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase font-sans">
                  SKILLS
                </h1>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center relative z-10 py-4 mt-[-15px] md:mt-0">
        <AnimatePresence mode="wait">
          
          {stage === "grid" && (
            <motion.div
              key="stack-grid"
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              initial={{ opacity: 0, y: 25, rotateX: 2 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col justify-center relative"
            >
              
              <div 
                className="w-full bg-[#050507]/90 border border-neutral-900 px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between text-[5.5px] min-[380px]:text-[6px] sm:text-[8px] font-mono text-neutral-500 border-b-0 rounded-t-lg sm:rounded-t-xl shadow-2xl"
                style={{ transform: "translateZ(20px)" }}
              >
                <div className="flex items-center gap-1.5 sm:gap-4 w-full max-w-[70%]">
                  <span className="text-blue-400 flex items-center gap-1 sm:gap-1.5 font-bold truncate">
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500 animate-ping flex-shrink-0" /> 
                    <span className="truncate">{systemLog}</span>
                  </span>
                  <span className="text-neutral-600 hidden min-[380px]:inline">|</span>
                  <span className="tracking-wider sm:tracking-widest uppercase hidden min-[380px]:inline flex-shrink-0">HEAP: <span className="text-neutral-300 font-bold">{mockHeap}</span></span>
                </div>
                <div className="text-neutral-600 tracking-wider flex-shrink-0 text-right">INDEX_NODES // {filteredTech.length}</div>
              </div>

              <div 
                className="bg-[#020203]/60 backdrop-blur-md border border-neutral-900 p-2 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4 border-t-0"
                style={{ transform: "translateZ(15px)" }}
              >
                <div className="space-y-0.5 flex-shrink-0">
                  <span className="text-blue-500 font-mono text-[5px] sm:text-[7px] tracking-[0.3em] uppercase font-black block">// CLUSTER_MAP_DATA</span>
                  <h3 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight uppercase font-sans">Technical Matrix</h3>
                </div>

                <div className="flex items-center gap-1 sm:gap-1 bg-black/80 border border-neutral-900 p-1 rounded-md sm:rounded-xl relative self-start md:self-auto w-full md:w-auto overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {[
                    { id: "all", label: "All Nodes" },
                    { id: "frontend", label: "Client" },
                    { id: "backend", label: "Server" },
                    { id: "database", label: "Storage" },
                    { id: "tools", label: "Systems" }
                  ].map((filter) => {
                    const isSelected = activeFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => handleFilterClick(filter.id as any, filter.label)}
                        className={`flex-none px-2 py-1 sm:px-3 sm:py-1.5 rounded-[4px] sm:rounded-lg font-mono text-[5.5px] sm:text-[7.5px] uppercase tracking-wider sm:tracking-widest transition-colors duration-300 relative cursor-pointer z-10 whitespace-nowrap ${
                          isSelected ? "text-black font-black" : "text-neutral-500 hover:text-neutral-200"
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="activeFilterSlider"
                            className="absolute inset-0 bg-white rounded-[4px] sm:rounded-lg -z-10 shadow-[0_0_15px_rgba(255,255,255,0.25)]"
                            transition={{ type: "spring", stiffness: 260, damping: 26 }}
                          />
                        )}
                        <span>{filter.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div 
                className="w-full border border-neutral-900 bg-[#020203]/40 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.01)] overflow-hidden rounded-b-lg sm:rounded-b-xl relative"
                style={{ transform: "translateZ(10px)" }}
              >
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px] z-0" />
                
                <motion.div
                  variants={gridContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 w-full relative z-10"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredTech.map((tech) => (
                      <motion.div
                        layout={true}
                        key={tech.name}
                        initial={{ opacity: 0, scale: 0.92, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 10, transition: { duration: 0.15 } }}
                        transition={{
                          layout: { type: "spring", stiffness: 200, damping: 25 },
                          opacity: { duration: 0.2 }
                        }}
                        className="flex w-full"
                      >
                        <SkillCard tech={tech} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>

              <div 
                className="w-full flex justify-between items-center text-[5px] sm:text-[7px] md:text-[8px] font-mono text-neutral-600 px-1 mt-1.5 sm:mt-2"
                style={{ transform: "translateZ(12px)" }}
              >
                <div className="flex items-center gap-1.5 uppercase tracking-widest truncate max-w-[75%]">
                  <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                  STABLE_STREAM // PIPELINE_OK
                </div>
                <div className="uppercase tracking-widest text-neutral-700 font-bold text-right">LIVE_SYNC</div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}