"use client";

import { motion, AnimatePresence, useInView, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useState, useEffect, memo } from "react";
import Image from "next/image";
import SpaceBackground from "./SpaceBackground"; 
import { db } from "../lib/firebase"; 
import { collection, getDocs, doc, updateDoc, increment, arrayUnion, arrayRemove } from "firebase/firestore";

// --- Interfaces & Types ---
interface Review {
  id: string; 
  user: string;
  clientType?: string; 
  codeQualityRating?: number; 
  uiRating?: number; 
  rating: number;
  comment: string;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  desc: string;
  shortSpecs?: string[]; 
  tech: string;
  techList?: string[]; 
  category: string;   
  image: string;      
  images?: string[];  
  videoUrl?: string;
  liveLink: string;
  githubLink: string;
  views: number;
  liveClicks?: number; 
  codeClicks?: number; 
  reviews: Review[];
  isAdminFeatured?: boolean; 
  rotatingWords?: string[]; 
}

// GitHub Repo Interface
interface Repo {
  id: number;
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  html_url: string;
  updated_at: string;
}

const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };

export default function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]); 
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showPreloader, setShowPreloader] = useState(false);
  const [myCreatedReviewIds, setMyCreatedReviewIds] = useState<string[]>([]);
  const [mediaIndex, setMediaIndex] = useState(0); 
  
  const [activeTab, setActiveTab] = useState<"projects" | "developer">("projects");
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  // GitHub Data States (Real Data logic)
  const [githubStats, setGithubStats] = useState({ repos: 0, followers: 0, stars: 0, forks: 0 });
  const [githubRepos, setGithubRepos] = useState<Repo[]>([]);
  const [dynamicStreak, setDynamicStreak] = useState(0);
  const [commitsMap, setCommitsMap] = useState<Record<number, number>>({});
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());

  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.1 });

  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    const el = sectionRef.current;
    if (!el || window.innerWidth < 768) return;
    const rect = el.getBoundingClientRect();
    rawMouseX.set(e.clientX - rect.left - rect.width / 2);
    rawMouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleContainerMouseLeave = () => {
    rawMouseX.set(0);
    rawMouseY.set(0);
  };

  const availableFilters = [
    { id: "next", label: "Next.JS", icon: <span className="text-sm font-black text-white">N</span> },
    { id: "react", label: "React", icon: <span className="text-sm text-[#61DAFB]">⚛</span> },
    { id: "tailwind", label: "Tailwind", icon: <span className="text-sm text-[#38BDF8]">≈</span> },
    { id: "html", label: "HTML", icon: <span className="text-sm text-[#E34F26] font-black">5</span> },
    { id: "css", label: "CSS", icon: <span className="text-sm text-[#1572B6] font-black">3</span> },
    { id: "javascript", label: "JavaScript", icon: <span className="text-sm text-[#F7DF1E] font-black">JS</span> },
    { id: "typescript", label: "TypeScript", icon: <span className="text-sm text-[#3178C6] font-black">TS</span> },
    { id: "node", label: "Node.JS", icon: <span className="text-sm text-[#339933]">⬢</span> },
    { id: "express", label: "Express", icon: <span className="text-white font-black text-[10px]">EX</span> },
    { id: "mongo", label: "MongoDB", icon: <span className="text-sm text-[#47A248]">🍃</span> },
    { id: "firebase", label: "Firebase", icon: <span className="text-sm text-[#FFCA28]">🔥</span> },
    { id: "bootstrap", label: "Bootstrap", icon: <span className="text-sm text-[#7952B3] font-black">B</span> }
  ];

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
  };

  // NOTE: Developer tab is temporarily locked to prioritize portfolio deployment
  const handleTabChange = (tab: "projects" | "developer") => {
    if (tab === "developer") {
      alert("Developer section is temporarily locked until the main portfolio is fully deployed.");
      return;
    }
    if (tab === activeTab) return;
    setSlideDirection(tab === "developer" ? "right" : "left");
    setActiveTab(tab);
    
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const projectMedia: { type: "image" | "video"; url: string }[] = [];
  if (selectedProject) {
    if (selectedProject.images && selectedProject.images.length > 0) {
      selectedProject.images.forEach(img => projectMedia.push({ type: "image", url: img }));
    } else {
      projectMedia.push({ type: "image", url: selectedProject.image });
    }
    if (selectedProject.videoUrl) {
      projectMedia.push({ type: "video", url: selectedProject.videoUrl });
    }
  }

  const nextMedia = () => { if (projectMedia.length > 0) setMediaIndex((prev) => (prev + 1) % projectMedia.length); };
  const prevMedia = () => { if (projectMedia.length > 0) setMediaIndex((prev) => (prev - 1 + projectMedia.length) % projectMedia.length); };

  useEffect(() => {
    const savedReviews = JSON.parse(localStorage.getItem("my_matrix_reviews") || "[]");
    setMyCreatedReviewIds(savedReviews);

    const fetchProjects = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        const fetchedProjects: Project[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedProjects.push({ 
            id: doc.id, 
            ...data,
            category: data.category || "other",
            techList: data.techList || [], 
            liveClicks: data.liveClicks || 0,
            codeClicks: data.codeClicks || 0,
            reviews: data.reviews || [],
          } as Project);
        });
        setProjects(fetchedProjects);
      } catch (error) { console.error("Error fetching projects:", error); } 
      finally { setLoadingProjects(false); }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeTab === "developer") {
      const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
      const headers = token ? { Authorization: `token ${token}` } : {};

      fetch("https://api.github.com/users/MdElattar", { headers })
        .then(res => {
           if (!res.ok) throw new Error("GitHub API Error");
           return res.json();
        })
        .then(data => {
          if(data.public_repos !== undefined) {
            setGithubStats(prev => ({ ...prev, repos: data.public_repos, followers: data.followers || 0 }));
          }
        }).catch(e => console.error(e));

      fetch("https://api.github.com/users/MdElattar/repos?per_page=100", { headers })
        .then(res => {
           if (!res.ok) throw new Error("GitHub API Error");
           return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            const stars = data.reduce((acc: number, repo: Repo) => acc + repo.stargazers_count, 0);
            const forks = data.reduce((acc: number, repo: Repo) => acc + repo.forks_count, 0);
            setGithubStats(prev => ({ ...prev, stars, forks }));
            
            const sorted = [...data].sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            setGithubRepos(sorted.slice(0, 2));
          }
        }).catch(e => console.error(e));

      fetch("https://api.github.com/users/MdElattar/events/public?per_page=100", { headers })
        .then(res => {
           if (!res.ok) throw new Error("GitHub API Error");
           return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            const dates = [...new Set(data.map((event: any) => new Date(event.created_at).toDateString()))];
            let streak = 0;
            let d = new Date();
            if (dates.includes(d.toDateString())) streak++;
            d.setDate(d.getDate() - 1);
            while(dates.includes(d.toDateString())) {
              streak++;
              d.setDate(d.getDate() - 1);
            }
            setDynamicStreak(streak);

            const yearMap: Record<number, number> = {};
            data.forEach((ev: any) => {
                const year = new Date(ev.created_at).getFullYear();
                yearMap[year] = (yearMap[year] || 0) + 1;
            });
            setCommitsMap(yearMap);
          }
        }).catch(e => console.error(e));
    }
  }, [activeTab]);

  useEffect(() => {
    document.body.style.overflow = selectedProject ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedProject]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isInView) {
      setShowPreloader(true);
      timeout = setTimeout(() => setShowPreloader(false), 1500);
    }
    if (!isInView) {
      setActiveTab("projects");
    }
    return () => clearTimeout(timeout);
  }, [isInView]);

  const openProjectDetails = async (project: Project) => {
    setMediaIndex(0);
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, views: (p.views || 0) + 1 } : p));
    setSelectedProject({ ...project, views: (project.views || 0) + 1 });
    try { await updateDoc(doc(db, "projects", project.id), { views: increment(1) }); } catch (e) {}
  };

  const logLiveClick = async (projectId: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, liveClicks: (p.liveClicks || 0) + 1 } : p));
    if (selectedProject && selectedProject.id === projectId) setSelectedProject(prev => prev ? { ...prev, liveClicks: (prev.liveClicks || 0) + 1 } : null);
    try { await updateDoc(doc(db, "projects", projectId), { liveClicks: increment(1) }); } catch (e) {}
  };

  const logCodeClick = async (projectId: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, codeClicks: (p.codeClicks || 0) + 1 } : p));
    if (selectedProject && selectedProject.id === projectId) setSelectedProject(prev => prev ? { ...prev, codeClicks: (prev.codeClicks || 0) + 1 } : null);
    try { await updateDoc(doc(db, "projects", projectId), { codeClicks: increment(1) }); } catch (e) {}
  };

  const handleAddReview = async (reviewData: Omit<Review, "id" | "createdAt">) => {
    if (!selectedProject) return;
    const reviewId = "rev_" + Math.random().toString(36).substr(2, 9);
    const finalReview: Review = { id: reviewId, ...reviewData, createdAt: new Date().toISOString() };
    
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        const updated = { ...p, reviews: [finalReview, ...(p.reviews || [])] };
        setSelectedProject(updated);
        return updated;
      }
      return p;
    }));
    const updatedMyIds = [...myCreatedReviewIds, reviewId];
    setMyCreatedReviewIds(updatedMyIds);
    localStorage.setItem("my_matrix_reviews", JSON.stringify(updatedMyIds));
    try { await updateDoc(doc(db, "projects", selectedProject.id), { reviews: arrayUnion(finalReview) }); } catch (error) {}
  };

  const handleDeleteReview = async (review: Review) => {
    if (!selectedProject) return;
    if (!confirm("Are you sure you want to purge this review from the feed?")) return;
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        const updatedReviews = p.reviews.filter(r => r.id !== review.id);
        const updated = { ...p, reviews: updatedReviews };
        setSelectedProject(updated);
        return updated;
      }
      return p;
    }));
    try {
      await updateDoc(doc(db, "projects", selectedProject.id), { reviews: arrayRemove(review) });
      const updatedMyIds = myCreatedReviewIds.filter(id => id !== review.id);
      setMyCreatedReviewIds(updatedMyIds);
      localStorage.setItem("my_matrix_reviews", JSON.stringify(updatedMyIds));
    } catch (error) {}
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title?.toLowerCase().includes(searchQuery.toLowerCase()) || project.tech?.toLowerCase().includes(searchQuery.toLowerCase());
    const projectTechs = (project.techList?.join(" ") || project.tech || "").toLowerCase();
    const matchesFilters = selectedFilters.length === 0 || selectedFilters.every(filter => projectTechs.includes(filter.toLowerCase()));
    return matchesSearch && matchesFilters;
  });

  const getCommitsForYear = (year: number) => {
    return commitsMap[year] || 0; 
  };

  return (
    <section 
      ref={sectionRef} 
      id="projects" 
      className="w-full min-h-screen bg-transparent relative flex flex-col items-center justify-start overflow-x-hidden pt-16 pb-20 sm:pt-20 sm:pb-24 select-none px-4 sm:px-6 lg:px-8 scroll-mt-32"
    >
      <SpaceBackground />

      {/* Preloader matching Home preloader exactly */}
      <AnimatePresence>
        {showPreloader && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(20px)", y: -20 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 bg-[#000000] z-[9999999] flex flex-col items-center justify-center w-screen h-screen"
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
                PROJECTS
              </h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1050px] w-full relative z-10 flex flex-col h-auto pt-4">
        
        <div className="flex justify-center w-full mb-8">
          <div className="flex bg-[#080808]/90 backdrop-blur-xl border border-neutral-800 p-1.5 rounded-full shadow-lg">
            <button 
              onClick={() => handleTabChange("projects")} 
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-[9px] uppercase tracking-widest transition-all duration-300 ${activeTab === "projects" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg" : "text-neutral-500 hover:text-white border border-transparent"}`}
            >
              <span className="text-sm">📁</span> Projects
            </button>
            {/* Developer tab button is temporarily locked to prioritize portfolio deployment */}
            <button 
              onClick={() => handleTabChange("developer")} 
              className="flex items-center gap-2 px-4 py-2 rounded-full font-mono text-[9px] uppercase tracking-widest text-neutral-600 border border-transparent opacity-50 cursor-not-allowed"
              title="Developer section is temporarily locked until the main portfolio is fully deployed."
            >
              <span className="text-sm">⑂</span> Developer (Locked)
            </button>
          </div>
        </div>

        <div className="w-full relative overflow-visible min-h-[600px]">
          <AnimatePresence mode="wait" custom={slideDirection}>
            
            {activeTab === "projects" ? (
              <motion.div
                key="projects-tab"
                initial={{ opacity: 0, x: slideDirection === "right" ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDirection === "right" ? -100 : 100 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full flex flex-col"
              >
                <div className="flex flex-col items-start text-left gap-1 mb-8 pb-2">
                  <span className="text-blue-500 font-mono text-[10px] tracking-[0.3em] uppercase block cursor-default">// ARCHITECTURAL REPOSITORIES</span>
                  <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase">Exemplary Deployments</h2>
                </div>

                <div className="w-full mb-10 flex flex-col gap-5 items-start text-left">
                  
                  <div className="w-full relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg group-focus-within:text-white transition-colors">⚲</span>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects by title, tags, or core technologies..." 
                      className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl pl-12 pr-4 py-4 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-3 w-full items-start">
                    <span className="text-[10px] font-mono text-neutral-600 tracking-widest uppercase font-bold text-left">FILTER VIEW:</span>
                    <div className="flex flex-wrap gap-2.5 items-center justify-start w-full">
                      {availableFilters.map((btn) => {
                        const isSelected = selectedFilters.includes(btn.id);
                        return (
                          <motion.button
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            key={btn.id}
                            onClick={() => toggleFilter(btn.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-300 border ${
                              isSelected 
                                ? "bg-[#111] text-white border-neutral-500 shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                                : "bg-black text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700"
                            }`}
                          >
                            {btn.icon}
                            {btn.label}
                          </motion.button>
                        );
                      })}
                      <AnimatePresence>
                        {selectedFilters.length > 0 && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => setSelectedFilters([])}
                            className="px-3 py-2 rounded-lg font-mono text-[9px] text-neutral-500 hover:text-white transition-colors tracking-widest uppercase font-bold"
                          >
                            [ RESET ]
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {loadingProjects ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full pb-10">
                    {[1, 2, 3].map((n) => <ProjectSkeletonCard key={n} />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full pb-10">
                    {filteredProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} onOpen={() => openProjectDetails(project)} />
                    ))}
                    {filteredProjects.length === 0 && (
                      <div className="col-span-full text-center text-xs font-mono text-neutral-600 py-20 border border-dashed border-neutral-900 rounded-2xl bg-[#020202]/50">
                        // NULL_POINTER: NO_PROJECTS_FOUND_IN_SYSTEM
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedProject && (
          <div className="fixed inset-0 z-[9999999] flex items-start justify-center overflow-y-auto overflow-x-hidden p-0 bg-black/50 backdrop-blur-xl scroll-smooth">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.05 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.1 }}
              className="fixed inset-0 pointer-events-none flex justify-between items-center z-0 overflow-hidden text-white"
            >
              <span className="text-[25vw] font-black uppercase font-sans select-none whitespace-nowrap -ml-[5%] leading-none">
                {selectedProject.title.substring(0, 3)}
              </span>
              <span className="text-[25vw] font-black uppercase font-sans select-none whitespace-nowrap -mr-[5%] leading-none">
                {selectedProject.title.slice(-3)}
              </span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setSelectedProject(null)} 
              className="fixed inset-0 z-0 cursor-pointer" 
            />

            <button 
              onClick={() => setSelectedProject(null)} 
              className="fixed top-4 right-4 sm:top-8 sm:right-8 bg-neutral-900/90 hover:bg-white text-neutral-400 hover:text-black border border-neutral-800/80 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[9px] sm:text-[10px] font-mono transition-all duration-300 z-[210] tracking-widest backdrop-blur-md shadow-2xl group"
            >
              [ CLOSE <span className="group-hover:rotate-180 inline-block transition-transform duration-500 ease-in-out">✕</span> ]
            </button>

            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 30 }} 
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              className="relative z-10 w-full max-w-5xl text-white flex flex-col px-4 sm:px-6 md:px-8 pt-20 pb-36"
            >
              <div className="w-full flex flex-col text-left">
                
                <div className="relative w-full h-[40vh] sm:h-[55vh] md:h-[65vh] overflow-hidden mb-8 rounded-2xl bg-[#030303] border border-neutral-900/60 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
                  <div className="absolute inset-0 w-full h-full z-10">
                    {projectMedia[mediaIndex]?.type === "image" ? (
                      <Image src={projectMedia[mediaIndex].url} alt="Project Screen Matrix" fill priority className="object-cover transition-all duration-500" unoptimized />
                    ) : (
                      <video src={projectMedia[mediaIndex]?.url} controls autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    )}
                  </div>
                  {projectMedia.length > 1 && (
                    <>
                      <button onClick={prevMedia} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-white text-white hover:text-black border border-neutral-800 w-9 h-9 rounded-full flex items-center justify-center text-xs transition-all duration-300 z-20">←</button>
                      <button onClick={nextMedia} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-white text-white hover:text-black border border-neutral-800 w-9 h-9 rounded-full flex items-center justify-center text-xs transition-all duration-300 z-20">→</button>
                      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[9px] font-mono text-neutral-400 border border-neutral-800/80 z-20 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Node {mediaIndex + 1} / {projectMedia.length}
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full pb-12">
                  <div className="lg:col-span-8 flex flex-col gap-6">
                     <div className="bg-[#050505]/80 backdrop-blur-md border border-neutral-900 rounded-2xl p-6 sm:p-8 flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                          <span className="text-blue-500 tracking-[0.2em] uppercase font-bold">// STACK_DECODER:</span>
                          {selectedProject.techList && selectedProject.techList.length > 0 ? (
                            selectedProject.techList.map((tech, idx) => (
                              <span key={idx} className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-md text-[9px] text-neutral-300 uppercase">{tech}</span>
                            ))
                          ) : (
                            selectedProject.tech && selectedProject.tech.split("//").map(t => t.trim()).filter(Boolean).map((tech, idx) => (
                              <span key={idx} className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-md text-[9px] text-neutral-300 uppercase">{tech}</span>
                            ))
                          )}
                        </div>
                        <h3 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase leading-tight">{selectedProject.title}</h3>
                        <p className="text-neutral-400 text-sm sm:text-base leading-relaxed pt-2 font-sans font-light border-t border-neutral-900/50 mt-2">{selectedProject.desc}</p>
                     </div>
                  </div>

                  <div className="lg:col-span-4 flex flex-col gap-6">
                     <div className="bg-[#050505]/80 backdrop-blur-md border border-neutral-900 p-6 rounded-2xl flex flex-col gap-5 justify-center h-full">
                        <div className="flex items-center gap-4 cursor-default">
                          <div className="relative w-14 h-14 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 flex-shrink-0">
                            <Image src="/MOHAMED-ELATTAR.PNG" alt="ELATTAR Profile" fill sizes="56px" className="object-cover" unoptimized />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-mono text-blue-400 tracking-widest uppercase">CORE ARCHITECT</span>
                            <span className="text-base font-bold text-neutral-200 tracking-wide uppercase">ELATTAR</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 w-full border-t border-neutral-900/50 pt-5">
                          <motion.a whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => logLiveClick(selectedProject.id)} href={selectedProject.liveLink} target="_blank" rel="noreferrer" className="w-full text-center px-4 py-3.5 bg-white text-black hover:bg-neutral-200 transition-all font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 tracking-widest shadow-xl uppercase">LIVE DEPLOYMENT ↗</motion.a>
                          <motion.a whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => logCodeClick(selectedProject.id)} href={selectedProject.githubLink} target="_blank" rel="noreferrer" className="w-full text-center px-4 py-3.5 bg-[#0a0a0a] hover:bg-[#111] text-neutral-300 border border-neutral-800 transition-all font-mono text-xs rounded-xl flex items-center justify-center gap-2 tracking-widest uppercase">KERNEL SOURCE</motion.a>
                        </div>
                     </div>
                  </div>
                  
                  <div className="lg:col-span-12">
                     <div className="bg-[#050505]/80 backdrop-blur-md border border-neutral-900 rounded-2xl p-6 sm:p-8">
                        <span className="text-[10px] font-mono text-neutral-600 tracking-widest uppercase block border-l-2 border-blue-500 pl-3 mb-6">// SYSTEM_TELEMETRY</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 text-center">
                            <span className="text-neutral-500 block text-[10px] uppercase tracking-widest mb-1.5 font-mono">System Views</span>
                            <span className="text-white font-mono font-black text-2xl">{selectedProject.views || 0}</span>
                          </div>
                          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 text-center">
                            <span className="text-neutral-500 block text-[10px] uppercase tracking-widest mb-1.5 font-mono">Live Invocations</span>
                            <span className="text-blue-500 font-mono font-black text-2xl">{selectedProject.liveClicks || 0}</span>
                          </div>
                          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 text-center">
                            <span className="text-neutral-500 block text-[10px] uppercase tracking-widest mb-1.5 font-mono">Source Queries</span>
                            <span className="text-purple-500 font-mono font-black text-2xl">{selectedProject.codeClicks || 0}</span>
                          </div>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="pt-2 space-y-12 text-left w-full">
                  {selectedProject.reviews && selectedProject.reviews.length > 0 && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono text-neutral-600 tracking-widest uppercase block border-l-2 border-neutral-800 pl-3">// FEEDBACK_LOGS_STREAM ({selectedProject.reviews.length})</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedProject.reviews.map((rev) => (
                          <div key={rev.id} className="bg-[#050505]/80 backdrop-blur-md border border-neutral-900 rounded-2xl p-5 relative">
                            <div className="flex flex-wrap items-center justify-between mb-4 text-neutral-400 font-mono text-[10px] gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold text-xs uppercase">{rev.user}</span>
                                {rev.clientType && <span className="bg-neutral-900 px-2 py-1 rounded text-[8px] text-blue-400 border border-neutral-800 uppercase tracking-wider">{rev.clientType}</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-yellow-500 tracking-widest text-[11px]">{"★".repeat(rev.rating)}</span>
                                {myCreatedReviewIds.includes(rev.id) && (
                                  <button onClick={() => handleDeleteReview(rev)} className="text-red-500 hover:text-red-400 cursor-pointer font-mono text-[9px] bg-red-950/20 px-2 py-0.5 rounded border border-red-900/30 transition-colors">PURGE 🗑️</button>
                                )}
                              </div>
                            </div>
                            <p className="text-neutral-400 font-sans text-xs sm:text-sm leading-relaxed font-light">{rev.comment}</p>
                            
                            {(rev.uiRating || rev.codeQualityRating) && (
                               <div className="flex gap-2 mt-4 font-mono text-[9px] text-blue-400 border-t border-neutral-800/50 pt-3">
                                 {rev.uiRating && <span className="bg-blue-900/10 border border-blue-900/30 px-2.5 py-1 rounded">UI_UX: {rev.uiRating}/5</span>}
                                 {rev.codeQualityRating && <span className="bg-blue-900/10 border border-blue-900/30 px-2.5 py-1 rounded">CODE_ARCH: {rev.codeQualityRating}/5</span>}
                               </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-4"><ReviewForm onSubmit={handleAddReview} /></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

const ProjectCard = memo(function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [overlayState, setOverlayState] = useState(0); 

  const parsedTechList = project.techList && project.techList.length > 0 
    ? project.techList 
    : project.tech ? project.tech.split(",").map(t => t.trim()).filter(Boolean) : [];

  const myAvatarUrl = "/MOHAMED-ELATTAR.PNG";

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (project.images && project.images.length > 1) {
      interval = setInterval(() => {
        setImgIndex(prev => (prev + 1) % project.images!.length);
      }, 3000); 
    }
    return () => clearInterval(interval);
  }, [project.images]);

  useEffect(() => {
    const interval = setInterval(() => {
      setOverlayState(prev => (prev === 0 ? 1 : 0));
    }, 3500); 
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const card = cardRef.current; 
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2; 
    const y = e.clientY - box.top - box.height / 2;
    card.style.transform = `perspective(1200px) rotateX(${-y / 25}deg) rotateY(${x / 25}deg)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current || window.innerWidth < 768) return;
    cardRef.current.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
  };

  const currentImage = project.images && project.images.length > 0 ? project.images[imgIndex] : project.image;

  return (
    <div
      ref={cardRef} 
      onMouseMove={handleMouseMove} 
      onMouseLeave={handleMouseLeave} 
      onClick={onOpen}
      className="w-full bg-[#050505] border border-neutral-900 rounded-2xl overflow-hidden transition-all duration-300 ease-out cursor-pointer hover:border-neutral-700 hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] group flex flex-col h-[340px] p-3"
    >
        <div className="h-40 w-full relative overflow-hidden bg-black rounded-xl border border-neutral-900 mb-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
             <motion.div
               key={currentImage}
               initial={{ opacity: 0.5 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0.5 }}
               transition={{ duration: 0.5 }}
               className="absolute inset-0"
             >
               <Image src={currentImage} alt={project.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-700 grayscale-[0.3] group-hover:scale-[1.05] group-hover:grayscale-0" unoptimized />
             </motion.div>
          </AnimatePresence>
          
          <div className="absolute inset-0 z-30 pointer-events-none p-3">
            <AnimatePresence mode="wait">
              {overlayState === 0 ? (
                 <motion.div
                   key="identity"
                   initial={{ opacity: 0, y: -5 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 5 }}
                   transition={{ duration: 0.4 }}
                   className="absolute top-2 left-2 bg-black/80 backdrop-blur-md p-1.5 rounded-full border border-neutral-800 shadow-2xl"
                 >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-neutral-600 relative">
                       <Image src={myAvatarUrl} alt="Author" fill className="object-cover" unoptimized />
                    </div>
                 </motion.div>
              ) : (
                 <motion.div
                   key="tech"
                   initial={{ opacity: 0, y: -5 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 5 }}
                   transition={{ duration: 0.4 }}
                   className="w-full h-full relative"
                 >
                    <div className="absolute top-0 left-0 flex flex-wrap gap-1.5 max-w-[75%]">
                       {parsedTechList.slice(0, 3).map((spec, idx) => (
                         <span key={idx} className="bg-[#050505]/95 border border-neutral-800 text-blue-400 px-3 py-1.5 rounded-full text-[8px] font-bold font-mono uppercase tracking-wider shadow-lg backdrop-blur-md">
                           {spec}
                         </span>
                       ))}
                    </div>
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col flex-grow text-left">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-wide group-hover:text-blue-400 transition-colors uppercase line-clamp-1">{project.title}</h3>
          <p className="text-neutral-500 font-sans text-xs sm:text-sm line-clamp-2 leading-relaxed flex-grow font-light">{project.desc}</p>
          
          <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300 transition-colors tracking-widest mt-auto border-t border-neutral-900/50 pt-3">
            <span className="uppercase">Audit Project</span>
            <span className="transform group-hover:translate-x-1 transition-transform text-white font-bold">→</span>
          </div>
        </div>
    </div>
  );
});

function ReviewForm({ onSubmit }: { onSubmit: (data: { user: string; rating: number; comment: string; clientType?: string; codeQualityRating?: number; uiRating?: number; }) => void }) {
  const [user, setUser] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [clientType, setClientType] = useState("");
  const [codeQualityRating, setCodeQualityRating] = useState<number | undefined>(undefined);
  const [uiRating, setUiRating] = useState<number | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!user.trim()) { setErrorMsg("Operator Identity Signature required."); return; }
    if (!comment.trim() || comment.length < 8) { setErrorMsg("Audit description must cross the 8-character threshold."); return; }
    onSubmit({ user, comment, rating, clientType: clientType || undefined, codeQualityRating, uiRating });
    setUser(""); setComment(""); setRating(5); setClientType(""); setCodeQualityRating(undefined); setUiRating(undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#050505] p-6 sm:p-8 rounded-2xl border border-neutral-900 space-y-5 text-left">
      <span className="text-[10px] font-mono text-neutral-600 tracking-widest block border-b border-neutral-900/50 pb-3 mb-3 uppercase">// INJECT_FEEDBACK_TELEMETRY</span>
      {errorMsg && <p className="text-[10px] font-mono text-red-500 bg-red-950/10 p-3 border border-red-900/30 rounded-xl">{errorMsg}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-2 tracking-wider">Your Signature *</label>
          <input type="text" required value={user} onChange={(e) => setUser(e.target.value)} placeholder="Identity Name" className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors" />
        </div>
        <div>
          <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-2 tracking-wider">Entity Verification</label>
          <select value={clientType} onChange={(e) => setClientType(e.target.value)} className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-400 focus:outline-none focus:border-neutral-600 transition-colors cursor-pointer">
            <option value="">Select Class...</option>
            <option value="Client">Client / Owner</option>
            <option value="Developer">Auditor / Dev Peer</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-2 tracking-wider">Core Rating</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-xs text-yellow-500 focus:outline-none focus:border-neutral-600 transition-colors cursor-pointer">
            <option value={5}>★★★★★ (5/5)</option>
            <option value={4}>★★★★☆ (4/5)</option>
            <option value={3}>★★★☆☆ (3/5)</option>
            <option value={2}>★★☆☆☆ (2/5)</option>
            <option value={1}>★☆☆☆☆ (1/5)</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-2 tracking-wider">UI Evaluation</label>
          <select value={uiRating || ""} onChange={(e) => setUiRating(e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-400 focus:outline-none focus:border-neutral-600 transition-colors cursor-pointer">
            <option value="">No Matrix</option>
            <option value={5}>5 - High Precision</option>
            <option value={4}>4 - Cohesive</option>
            <option value={3}>3 - Standard</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-2 tracking-wider">Code Architecture</label>
          <select value={codeQualityRating || ""} onChange={(e) => setCodeQualityRating(e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-400 focus:outline-none focus:border-neutral-600 transition-colors cursor-pointer">
            <option value="">No Matrix</option>
            <option value={5}>5 - Highly Decoupled</option>
            <option value={4}>4 - Optimized</option>
            <option value={3}>3 - Functional</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-2 tracking-wider">Audit logs payload *</label>
        <textarea required rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Compile code logs or visual audit specs..." className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors resize-none" />
      </div>
      <motion.button whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.99 }} type="submit" className="w-full px-6 py-3.5 bg-white hover:bg-neutral-200 text-black border border-transparent rounded-xl text-xs font-mono font-bold transition-all duration-300 tracking-widest uppercase cursor-pointer shadow-xl">
        [ TRANSMIT LOGS ]
      </motion.button>
    </form>
  );
}

function ProjectSkeletonCard() {
  return (
    <div className="w-full bg-[#030303]/60 border border-neutral-900 rounded-2xl p-4 flex flex-col h-[340px] space-y-4 animate-pulse">
      <div className="h-40 w-full bg-[#0a0a0a] rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-800/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      </div>
      <div className="space-y-3 flex-grow mt-2">
        <div className="h-3 w-1/3 bg-neutral-900 rounded" />
        <div className="h-5 w-3/4 bg-neutral-900 rounded" />
      </div>
    </div>
  );
}