"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import SkillsTerminal from "../app/components/SkillsTerminal";
import HeroScene from "../app/components/HeroScene";
import Navigation from "../app/components/Navigation";
import ProjectsSection from "../app/components/ProjectsSection";
import MatrixRain from "../app/components/MatrixRain"; // Matrix Background Module

// Reliable relative path to avoid Firebase module resolution errors
import { auth, googleProvider } from "./lib/firebase"; 
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";

export default function Home() {
  const [activeSection, setActiveSection] = useState(0);
  const isScrollingRef = useRef(false);
  const touchStartYRef = useRef(0);

  // Secret Screen & Auth States
  const [isSecretOpen, setIsSecretOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const sections = ["home", "skills", "projects"];

  // --- Authentication Functions ---
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setAuthError("");
      if (!auth) throw new Error("Firebase Auth not initialized");
      await signInWithPopup(auth , googleProvider);
      router.push("/admin"); 
    } catch (err: any) {
      setAuthError("Google Login Failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setAuthError("");
      if (!auth) throw new Error("Firebase Auth not initialized");
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin"); 
    } catch (err: any) {
      setAuthError("Invalid Admin Email or Password.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Section Navigation Controller ---
  const changeSection = (index: number) => {
    if (index < 0 || index >= sections.length || isScrollingRef.current) return;
    
    isScrollingRef.current = true;
    setActiveSection(index);

    const targetElement = document.getElementById(sections[index]);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 1000);
  };

  // --- Scroll Control & Modal Overlay Protection ---
  useEffect(() => {
    // Completely lock main page scrolling if the secret screen is active
    if (isSecretOpen) {
      document.body.style.overflow = "hidden";
      return;
    } else {
      document.body.style.overflow = "auto";
    }

    const shouldAllowInternalScroll = (target: HTMLElement, direction: "down" | "up"): boolean => {
      let current: HTMLElement | null = target;
      while (current && current !== document.body) {
        const overflowY = window.getComputedStyle(current).overflowY;
        const isScrollable = overflowY === "auto" || overflowY === "scroll";
        const hasScrollSpace = current.scrollHeight > current.clientHeight;

        if (isScrollable && hasScrollSpace) {
          if (direction === "down") {
            if (current.scrollTop + current.clientHeight < current.scrollHeight - 5) return true;
          } else if (direction === "up") {
            if (current.scrollTop > 5) return true;
          }
        }
        current = current.parentElement;
      }
      return false;
    };

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      
      // Core Override: Allow native scrolling inside Modals, Dialogs, or Secret Screen
      if (
        target.closest("[role='dialog']") || 
        target.closest(".modal") || 
        target.closest(".fixed") || 
        isSecretOpen
      ) {
        return; 
      }

      const direction = e.deltaY > 0 ? "down" : "up";
      if (shouldAllowInternalScroll(target, direction)) return; 
      
      e.preventDefault(); 
      if (Math.abs(e.deltaY) < 20) return;

      const nextSection = direction === "down" ? activeSection + 1 : activeSection - 1;
      changeSection(nextSection);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isSecretOpen) return;
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;

      // Apply the same advanced protection on Touch Devices (Mobile/Tablet)
      if (
        target.closest("[role='dialog']") || 
        target.closest(".modal") || 
        target.closest(".fixed") || 
        isSecretOpen
      ) {
        return; 
      }

      const touchEndY = e.touches[0].clientY;
      const diffY = touchStartYRef.current - touchEndY;
      const direction = diffY > 0 ? "down" : "up";

      if (shouldAllowInternalScroll(target, direction)) return; 

      if (Math.abs(diffY) > 50) { 
        if (e.cancelable) e.preventDefault();
        const nextSection = direction === "down" ? activeSection + 1 : activeSection - 1;
        changeSection(nextSection);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      document.body.style.overflow = "auto";
    };
  }, [activeSection, isSecretOpen]);

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#000000] text-white relative font-sans flex flex-col scroll-smooth">
      
      <section id="home" className="h-screen w-full relative flex-shrink-0 overflow-hidden bg-[#020202]">
        <MatrixRain />
        <HeroScene isVisible={activeSection === 0} />
      </section>
      
      {/* Fixed: overflow-visible z-20 applied so cards aren't clipped */}
      <section id="skills" className="h-screen w-full relative flex-shrink-0 overflow-visible z-20">
        <SkillsTerminal isVisible={activeSection === 1} />
      </section>

      <section id="projects" className="h-screen w-full relative flex-shrink-0 overflow-y-auto custom-scrollbar">
        <ProjectsSection />
      </section>

      <Navigation activeSection={activeSection} onSectionChange={changeSection} />

      {/* --- Upgraded Side Pull Tab --- */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(e, info) => {
          if (info.offset.x < -30) {
            setIsSecretOpen(true);
          }
        }}
        onClick={() => setIsSecretOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] h-32 w-12 cursor-grab active:cursor-grabbing flex items-center justify-end group select-none"
      >
        <div className="bg-[#0c0c0c]/90 border-l border-y border-neutral-800/60 h-24 w-6 rounded-l-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.6)] group-hover:border-blue-500/40 group-hover:w-7 transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-neutral-500 group-hover:text-blue-500 group-hover:animate-pulse transition-colors">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </div>
      </motion.div>

      {/* --- Full Slide-in Secret Screen --- */}
      <AnimatePresence>
        {isSecretOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-0 z-[10000] bg-[#050505] flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
              <h1 className="text-[22vw] font-black text-neutral-900/[0.04] tracking-tighter uppercase select-none">
                Secret
              </h1>
            </div>

            <button 
              onClick={() => setIsSecretOpen(false)}
              className="absolute top-6 right-6 z-20 p-2.5 text-neutral-500 hover:text-white bg-neutral-900/60 hover:bg-neutral-800 rounded-full transition-colors cursor-pointer border border-neutral-800/40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative z-10 w-full max-w-md bg-[#090909]/80 backdrop-blur-3xl border border-neutral-800/60 rounded-2xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] mx-4">
              <div className="text-center mb-8">
                <p className="text-blue-500 font-mono text-[10px] mb-2 tracking-[0.3em] uppercase">Restricted Area</p>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Admin Access</h2>
              </div>

              {authError && (
                <div className="mb-5 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-500 text-[11px] text-center font-mono">
                  {authError}
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold text-sm px-4 py-3 rounded-xl hover:bg-neutral-200 transition-colors  cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 24c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 21.53 7.7 24 12 24z" />
                  <path fill="#FBBC05" d="M5.84 15.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V8.07H2.18C1.43 9.55 1 11.22 1 13s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.43 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" />
                </svg>
                Continue with Google
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
} 