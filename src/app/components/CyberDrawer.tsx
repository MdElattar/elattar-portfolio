"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Certification {
  id: number;
  title: string;
  issuer: string;
  date: string;
  isFeatured?: boolean; // خاص بشهادة الوزارة
  description: string;
}

export default function CyberDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const certs: Certification[] = [
    {
      id: 1,
      title: "Egypt Digital Cubs Initiative (DECI)",
      issuer: "Ministry of Communications (MCIT)",
      date: "2024 - 2026",
      isFeatured: true,
      description: "Selected as one of the top national tech talents for an intensive multi-year software engineering program under government supervision.",
    },
    {
      id: 2,
      title: "Full-Stack Web Development",
      issuer: "Programming Training Academy",
      date: "2024",
      description: "Mastered MERN Stack development and modern software architecture patterns.",
    },
    {
        id: 3,
        title: "Software Fundamentals Certificate",
        issuer: "MCIT Authorized Center",
        date: "2023",
        description: "Core algorithms, data structures, and computer science foundations.",
      },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* خلفية مغبشة (Overlay) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* الـ Drawer نفسه */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 inset-x-0 h-[85vh] bg-[#050505] border-t border-neutral-800 rounded-t-[2.5rem] z-[70] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* مقبض السحب (Decorative Handle) */}
            <div className="w-12 h-1.5 bg-neutral-800 rounded-full mx-auto mt-4 mb-8" />

            <div className="max-w-5xl mx-auto px-6 pb-20 overflow-y-auto h-full custom-scrollbar">
              {/* Header */}
              <div className="mb-10 flex justify-between items-start">
                <div>
                  <h2 className="text-blue-500 font-mono text-xs tracking-[0.3em] uppercase mb-2">
                    // [ SYSTEM_VERIFIED_CREDENTIALS ]
                  </h2>
                  <h3 className="text-3xl font-black text-white uppercase italic">Certifications</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 bg-neutral-900 rounded-full text-neutral-500 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {/* Grid الشهادات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certs.map((cert) => (
                  <motion.div
                    key={cert.id}
                    className={`relative p-6 border group transition-all duration-500 ${
                      cert.isFeatured 
                        ? "md:col-span-2 bg-gradient-to-br from-blue-950/20 to-black border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.1)]" 
                        : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    {/* وسم التحقق للوزارة */}
                    {cert.isFeatured && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-widest">Elite Talent Program</span>
                      </div>
                    )}

                    <div className="flex flex-col h-full justify-between">
                      <div>
                        <span className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mb-1 block">
                          {cert.issuer}
                        </span>
                        <h4 className={`font-black uppercase mb-4 leading-tight ${cert.isFeatured ? "text-2xl text-white" : "text-lg text-neutral-200"}`}>
                          {cert.title}
                        </h4>
                        <p className="text-neutral-400 text-sm font-mono leading-relaxed max-w-2xl">
                          {cert.description}
                        </p>
                      </div>

                      <div className="mt-8 flex items-center justify-between">
                        <span className="text-neutral-600 font-mono text-[10px]">{cert.date}</span>
                        {cert.isFeatured && (
                            <span className="text-[9px] font-mono text-blue-500/60 uppercase group-hover:text-blue-400 transition-colors">
                                [ Status: Verified_By_MCIT ]
                            </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}