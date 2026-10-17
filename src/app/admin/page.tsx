"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../lib/firebase"; 
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

// --- Interfaces ---
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
  tech: string;
  image: string; 
  images?: string[]; 
  videoUrl?: string; 
  videos?: string[]; 
  liveLink: string;
  githubLink: string;
  views: number;
  liveClicks?: number;
  codeClicks?: number;
  reviews: Review[];
}

interface Booking {
  id: string;
  type: "CALL_RESERVATION" | "DIRECT_MESSAGE";
  createdAt: string;
  payload: {
    date?: string;
    time?: string;
    name?: string;
    email: string;
    reason?: string;
    phone?: string;
    whatsapp?: boolean;
    message?: string;
  };
}

interface Toast {
  message: string;
  type: "success" | "error" | "warning";
}

interface SystemLog {
  id: string;
  time: string;
  msg: string;
  type: "info" | "success" | "warn" | "crit";
}

interface MediaField {
  id: string;
  type: "url" | "file";
  url: string;
  file: File | null;
  preview: string;
}

const initialFormState = {
  title: "",
  desc: "",
  tech: "",
  liveLink: "",
  githubLink: "",
};

export default function AdminPage() {
  const router = useRouter();
  
  // --- Auth & Loading States ---
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // --- Data States ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]); 
  const [activeTab, setActiveTab] = useState<"deploy" | "analytics" | "reviews" | "manage" | "reservations" | "logs">("deploy");
  
  // --- Cyberpunk Feature States ---
  const [accentColor, setAccentColor] = useState<"blue" | "green" | "red">("blue");
  const [isLocked, setIsLocked] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([
    { id: "init", time: new Date().toLocaleTimeString(), msg: "CORE_MATRIX: System initialization sequence established.", type: "info" }
  ]);

  // --- Dynamic Media Form States (Optional & Multiple) ---
  const [imageFields, setImageFields] = useState<MediaField[]>([]);
  const [videoFields, setVideoFields] = useState<MediaField[]>([]);

  // --- Core Form States ---
  const [formData, setFormData] = useState(initialFormState);
  const [uploading, setUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // --- Custom Confirm Modal State ---
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => {} });

  // --- Style Accent Mapper ---
  const accent = useMemo(() => {
    const classes = {
      blue: { text: "text-blue-500", lightText: "text-blue-400", border: "border-blue-900/40", focus: "focus:border-blue-500", bg: "bg-blue-500", borderFull: "border-blue-500" },
      green: { text: "text-emerald-500", lightText: "text-emerald-400", border: "border-emerald-900/40", focus: "focus:border-emerald-500", bg: "bg-emerald-500", borderFull: "border-emerald-500" },
      red: { text: "text-red-500", lightText: "text-red-400", border: "border-red-900/40", focus: "focus:border-red-500", bg: "bg-red-500", borderFull: "border-red-500" }
    };
    return classes[accentColor];
  }, [accentColor]);

  // --- Handlers ---
  const pushLog = (msg: string, type: SystemLog["type"] = "info") => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString(),
      msg,
      type
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const showToast = (message: string, type: Toast["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Dynamic Media Controls
  const addImageField = () => {
    setImageFields(prev => [...prev, { id: `img-${Date.now()}-${Math.random()}`, type: "url", url: "", file: null, preview: "" }]);
    pushLog("FORM_MATRIX: Allocated alternative image node channel.", "info");
  };

  const removeImageField = (id: string) => {
    setImageFields(prev => prev.filter(f => f.id !== id));
    pushLog("FORM_MATRIX: Purged alternative image node channel.", "warn");
  };

  const addVideoField = () => {
    setVideoFields(prev => [...prev, { id: `vid-${Date.now()}-${Math.random()}`, type: "url", url: "", file: null, preview: "" }]);
    pushLog("FORM_MATRIX: Allocated alternative video node channel.", "info");
  };

  const removeVideoField = (id: string) => {
    setVideoFields(prev => prev.filter(f => f.id !== id));
    pushLog("FORM_MATRIX: Purged alternative video node channel.", "warn");
  };

  const handleDynamicFileChange = (e: React.ChangeEvent<HTMLInputElement>, id: string, mediaType: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);

    const updateBlock = (prev: MediaField[]) => prev.map(f => f.id === id ? { ...f, file, preview: previewUrl, url: "" } : f);
    if (mediaType === "image") setImageFields(updateBlock);
    else setVideoFields(updateBlock);
  };

  const handleDynamicUrlChange = (value: string, id: string, mediaType: "image" | "video") => {
    const updateBlock = (prev: MediaField[]) => prev.map(f => f.id === id ? { ...f, url: value, file: null, preview: "" } : f);
    if (mediaType === "image") setImageFields(updateBlock);
    else setVideoFields(updateBlock);
  };

  const handleDynamicTypeChange = (type: "url" | "file", id: string, mediaType: "image" | "video") => {
    const updateBlock = (prev: MediaField[]) => prev.map(f => f.id === id ? { ...f, type, url: "", file: null, preview: "" } : f);
    if (mediaType === "image") setImageFields(updateBlock);
    else setVideoFields(updateBlock);
  };




  // State لإدارة الكلمات المتحركة
const [rotatingWords, setRotatingWords] = useState([{ id: Date.now(), text: "" }]);

// دوال التحكم في الكلمات
const addRotatingWord = () => {
  setRotatingWords([...rotatingWords, { id: Date.now(), text: "" }]);
};

const removeRotatingWord = (id: number) => {
  if (rotatingWords.length > 1) {
    setRotatingWords(rotatingWords.filter(word => word.id !== id));
  } else {
 
    pushLog("SYSTEM: Cannot purge the last rotating word node.");
};
}

const handleRotatingWordChange = (id: number, value: string) => {
  setRotatingWords(rotatingWords.map(word => 
    word.id === id ? { ...word, text: value } : word
  ));
};



  // Idle Timer Security Lock Mechanism
  useEffect(() => {
    if (!user) return;
    let idleTimer: NodeJS.Timeout;

    const triggerReset = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsLocked(true);
        pushLog("SECURITY_ALERT: System core auto-locked due to operator inactivity.", "crit");
      }, 5 * 60 * 1000); 
    };

    window.addEventListener("mousemove", triggerReset);
    window.addEventListener("keydown", triggerReset);
    triggerReset();

    return () => {
      window.removeEventListener("mousemove", triggerReset);
      window.removeEventListener("keydown", triggerReset);
      clearTimeout(idleTimer);
    };
  }, [user]);

  const fetchAdminData = async () => {
    if (!db) return;
    try {
      const querySnapshot = await getDocs(collection(db, "projects"));
      const fetched = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "Untitled",
          desc: data.desc || "",
          tech: data.tech || "",
          image: data.image || "",
          images: data.images || [],
          videoUrl: data.videoUrl || undefined,
          videos: data.videos || [],
          liveLink: data.liveLink || "",
          githubLink: data.githubLink || "",
          views: data.views || 0,
          liveClicks: data.liveClicks || 0,
          codeClicks: data.codeClicks || 0,
          reviews: (data.reviews || []).map((r: any, idx: number) => ({
            id: r.id || `legacy_${idx}`,
            user: r.user || "Anonymous Operator",
            comment: r.comment || "",
            rating: r.rating || 5,
            clientType: r.clientType || "",
            uiRating: r.uiRating || undefined,
            codeQualityRating: r.codeQualityRating || undefined,
            createdAt: r.createdAt || new Date().toISOString()
          }))
        } as Project;
      });
      setProjects(fetched);
      pushLog("TELEMETRY: Successfully pulled standard node registry updates.", "success");
    } catch (error) {
      console.error("Error fetching admin data matrix:", error);
      showToast("SYSTEM_ERROR: Failed to fetch node data", "error");
      pushLog("CRITICAL: Matrix sync failure across standard nodes.", "crit");
    }
  };

  // Realtime Bookings Sync + Push Notifications
  useEffect(() => {
    if (!db || !user) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    let isInitialLoad = true; 

    const unsubscribeBookings = onSnapshot(q, (snapshot) => {
      const fetchedBookings: Booking[] = [];
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad) {
          const newDoc = change.doc.data();
          pushLog(`INCOMING_STREAM: Packet transmission intercepted from [${newDoc.payload?.email || "UNKNOWN"}]`, "warn");
          if (Notification.permission === "granted") {
            const title = newDoc.type === "CALL_RESERVATION" ? "🚀 حجز مكالمة جديد!" : "🛰️ رسالة مباشرة جديدة!";
            const body = newDoc.type === "CALL_RESERVATION" 
              ? `العميل: ${newDoc.payload?.name} - الساعة: ${newDoc.payload?.time}`
              : `من: ${newDoc.payload?.email}\nالمحتوى: ${newDoc.payload?.message}`;
            
            new Notification(title, {
              body: body,
              icon: "/favicon.ico",
            });
          }
        }
      });

      snapshot.forEach((doc) => {
        fetchedBookings.push({ id: doc.id, ...doc.data() } as Booking);
      });

      setBookings(fetchedBookings);
      isInitialLoad = false;
    }, (error) => {
      console.error("Error syncing bookings seamlessly:", error);
    });

    return () => unsubscribeBookings();
  }, [user]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchAdminData();
      } else {
        router.push("/"); 
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      pushLog("AUTH_GATEWAY: Terminating master cryptographic token.", "warn");
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: data });
    const resData = await response.json();
    if (!response.ok) throw new Error(resData.error || "Upload failed");
    return resData.url; 
  };

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setUploading(true);
    pushLog("INJECTION: Preparing multiple-media asset cluster pipeline deployment...", "info");

    try {
      // 1. معالجة الصور الديناميكية
      const resolvedImages: string[] = [];
      for (const f of imageFields) {
        if (f.type === "file" && f.file) {
          const url = await uploadToCloudinary(f.file);
          if (url) resolvedImages.push(url);
        } else if (f.type === "url" && f.url && f.url.trim() !== "") {
          resolvedImages.push(f.url.trim());
        }
      }

      // 2. معالجة الفيديوهات الديناميكية
      const resolvedVideos: string[] = [];
      for (const f of videoFields) {
        if (f.type === "file" && f.file) {
          const url = await uploadToCloudinary(f.file);
          if (url) resolvedVideos.push(url);
        } else if (f.type === "url" && f.url && f.url.trim() !== "") {
          resolvedVideos.push(f.url.trim());
        }
      }

      const primaryImage = resolvedImages[0] || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600";
      const primaryVideo = resolvedVideos[0] || ""; 

      const rawProject = {
        title: formData.title || "",
        desc: formData.desc || "",
        tech: (formData.tech || "").toUpperCase(),
        image: primaryImage,
        images: resolvedImages,
        videoUrl: primaryVideo,
        videos: resolvedVideos,
        liveLink: formData.liveLink || "https://example.com",
        githubLink: formData.githubLink || "https://github.com",
        views: 0,
        liveClicks: 0,
        codeClicks: 0,
        reviews: [],
        rotatingWords: rotatingWords.map(w => w.text).filter(t => t.trim() !== "")
      };

      // تطهير الكائن تماماً لضمان عدم وجود أي undefined
      const newProject = JSON.parse(
        JSON.stringify(rawProject, (key, value) => (value === undefined ? "" : value))
      );

      await addDoc(collection(db, "projects"), newProject);
      setIsSuccess(true);
      pushLog(`DEPLOY_SUCCESS: Injected system node cluster [${formData.title}]`, "success");
      fetchAdminData();
      
      setTimeout(() => {
        setIsSuccess(false);
        setFormData(initialFormState);
        setImageFields([]);
        setVideoFields([]);
        setRotatingWords([{ id: Date.now(), text: "" }]);
        setActiveTab("manage"); 
      }, 2000);
      
    } catch (error: any) {
      console.error("Matrix deployment failed:", error);
      showToast(`DEPLOYMENT_FAILED: ${error.message || "Invalid input pattern"}`, "error");
      pushLog(`DEPLOY_CRITICAL: Injection rejected: ${error.message}`, "crit");
    } finally {
      setUploading(false);
    }
  };

  const handleAdminDeleteReview = (projectId: string, reviewToRemove: Review) => {
    setConfirmDialog({
      isOpen: true,
      message: `🚨 CRITICAL PROTOCOL: Purge ${reviewToRemove.user}'s review?`,
      onConfirm: async () => {
        try {
          const projectRef = doc(db, "projects", projectId);
          const targetProject = projects.find(p => p.id === projectId);
          if (!targetProject) return;

          const updatedReviews = targetProject.reviews.filter(r => r.id !== reviewToRemove.id);
          await updateDoc(projectRef, { reviews: updatedReviews });

          setProjects(prev => 
            prev.map(p => p.id === projectId ? { ...p, reviews: updatedReviews } : p)
          );

          showToast("REVIEW_PURGED_SUCCESSFULLY", "success");
          pushLog(`PURGE: Wiped review block issued by [${reviewToRemove.user}]`, "warn");
        } catch (error) {
          console.error("Failed to purge review:", error);
          showToast("ERROR: Insufficient node authorization.", "error");
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteProject = (projectId: string) => {
    const target = projects.find(p => p.id === projectId);
    setConfirmDialog({
      isOpen: true,
      message: "🚨 WARNING: Delete this project permanently from the matrix registry?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "projects", projectId));
          setProjects(prev => prev.filter(p => p.id !== projectId));
          showToast("NODE_DELETED_SUCCESSFULLY", "success");
          pushLog(`DESTRUCT: Terminated node registration block for [${target?.title || projectId}]`, "warn");
        } catch (error) {
          console.error("Failed to delete project:", error);
          showToast("ERROR: Could not delete node.", "error");
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteBooking = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      message: "🚨 CRITICAL PROTOCOL: Purge this transmission packet permanently?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "bookings", id));
          showToast("TRANSMISSION_PACKET_PURGED", "success");
          pushLog(`PURGE: Destructed structural packet transmission reference ID [${id}]`, "warn");
        } catch (error) {
          console.error("Failed to wipe data stream:", error);
          showToast("ERROR: Failed to destruct packet.", "error");
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Export Analytics Dataset Routine
  const handleExportRegistry = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ projects, bookings, exportedAt: new Date().toISOString() }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `METRICS_DUMP_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      pushLog("TELEMETRY: Successfully compiled and exported local registry cluster to disk.", "success");
      showToast("REGISTRY_EXPORTED_SUCCESSFULLY");
    } catch (err) {
      pushLog("TELEMETRY_ERROR: Failed compiling diagnostic structure.", "crit");
    }
  };

  // --- Memoized Derived Data ---
  const stats = useMemo(() => {
    return projects.reduce((acc, p) => ({
      views: acc.views + (p.views || 0),
      liveClicks: acc.liveClicks + (p.liveClicks || 0),
      codeClicks: acc.codeClicks + (p.codeClicks || 0),
    }), { views: 0, liveClicks: 0, codeClicks: 0 });
  }, [projects]);

  const allReviews = useMemo(() => {
    return projects.flatMap(p => p.reviews.map(r => ({ ...r, projectId: p.id, projectTitle: p.title })));
  }, [projects]);

  // --- Render Helpers ---
  const TabBtn = ({ id, label }: { id: typeof activeTab, label: string }) => (
    <button 
      onClick={() => { setActiveTab(id); pushLog(`VIEW_BRIDGE: Shifted operation context view to [${id.toUpperCase()}]`); }} 
      className={`px-3 py-2 font-mono text-[10px] rounded-lg tracking-wider transition-all border cursor-pointer ${activeTab === id ? "bg-white text-black border-white font-bold" : "bg-[#0c0c0c] text-neutral-400 border-neutral-900 hover:text-white"}`}
    >
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center font-mono text-xs tracking-widest text-blue-500 animate-pulse">
        INITIALIZING SECURE SESSION...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4 md:p-12 overflow-x-hidden relative">
      
      {/* Session Lock Screen Overlay */}
      <AnimatePresence>
        {isLocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black backdrop-blur-xl flex flex-col justify-center items-center font-mono p-4">
            <div className="max-w-md w-full border border-red-900/50 bg-[#070707] p-8 rounded-2xl relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.1)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse"></div>
              <h2 className="text-red-500 font-black text-sm tracking-[0.2em] mb-2 uppercase">// TERMINAL_SESSION_LOCKED</h2>
              <p className="text-neutral-500 text-[10px] leading-relaxed mb-8 uppercase">Core security layer intervened due to operator dormancy. Re-authorization required to access datastream nodes.</p>
              <button 
                onClick={() => { setIsLocked(false); pushLog("SECURITY: Cryptographic bridge validated and re-opened by operator.", "success"); }}
                className="w-full bg-red-950/30 hover:bg-red-900 border border-red-800 text-red-400 hover:text-white text-[10px] py-3 rounded-xl tracking-widest transition-all font-bold uppercase cursor-pointer"
              >
                [ RE_ESTABLISH_DECRYPT_BRIDGE ]
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cyberpunk Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#050505] border border-red-900/50 p-6 rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.15)] max-w-md w-full relative overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20"></div>
              <h3 className="text-red-500 font-mono text-lg font-black tracking-widest mb-4 uppercase">// SYSTEM_WARNING</h3>
              <p className="text-neutral-300 font-mono text-xs leading-relaxed mb-8">{confirmDialog.message}</p>
              <div className="flex justify-end gap-3 font-mono text-[10px]">
                <button onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 rounded transition-colors cursor-pointer">[ ABORT ]</button>
                <button onClick={confirmDialog.onConfirm} className="px-4 py-2 bg-red-950/40 border border-red-800 text-red-400 hover:bg-red-900 hover:text-white rounded transition-colors cursor-pointer">[ EXECUTE_PURGE ]</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification System */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg border font-mono text-[10px] tracking-widest shadow-2xl backdrop-blur-md
              ${toast.type === "error" ? "bg-red-950/80 border-red-500 text-red-200" : "bg-emerald-950/80 border-emerald-500 text-emerald-200"}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Fullscreen Overlay */}
      <AnimatePresence>
        {isSuccess && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            <motion.div animate={{ rotateY: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className={`w-16 h-16 mb-6 border-4 border-t-transparent border-r-transparent border-b-neutral-800 rounded-full ${accent.borderFull}`} />
            <h2 className="text-2xl font-black tracking-[0.2em] uppercase text-white mb-2">MATRIX INJECTED</h2>
            <p className={`font-mono text-[10px] tracking-widest ${accent.text}`}>DATABASE SYNCHRONIZED SUCCESSFULLY</p>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-neutral-900 pb-6 mb-12 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className={`font-mono text-[9px] tracking-[0.3em] uppercase font-bold ${accent.text}`}>// Core Admin Analytics Matrix</p>
            {/* Neon Accent Switcher */}
            <div className="flex bg-neutral-950 border border-neutral-900 rounded p-0.5 text-[8px] font-mono gap-1">
              <button onClick={() => { setAccentColor("blue"); pushLog("THEME: Accent color shifted to Cyber Blue."); }} className={`px-1.5 py-0.5 rounded cursor-pointer ${accentColor === "blue" ? "bg-blue-600 text-white" : "text-neutral-600"}`}>BLUE</button>
              <button onClick={() => { setAccentColor("green"); pushLog("THEME: Accent color shifted to Matrix Green."); }} className={`px-1.5 py-0.5 rounded cursor-pointer ${accentColor === "green" ? "bg-emerald-600 text-white" : "text-neutral-600"}`}>GREEN</button>
              <button onClick={() => { setAccentColor("red"); pushLog("THEME: Accent color shifted to Alert Red."); }} className={`px-1.5 py-0.5 rounded cursor-pointer ${accentColor === "red" ? "bg-red-600 text-white" : "text-neutral-600"}`}>RED</button>
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase">HQ Command Terminal</h1>
          <p className="text-neutral-500 font-mono text-[11px] mt-1">Operator: <span className="text-neutral-300">{user?.email}</span></p>
        </div>
        <div className="flex flex-wrap gap-2 lg:gap-3 w-full xl:w-auto">
          <TabBtn id="deploy" label="[01] DEPLOY" />
          <TabBtn id="manage" label="[02] PROJECTS" />
          <TabBtn id="analytics" label="[03] METRICS" />
          <TabBtn id="reviews" label="[04] REVIEWS" />
          <TabBtn id="reservations" label={`[05] RESERVATIONS (${bookings.length})`} />
          <TabBtn id="logs" label={`[06] LOGS (${logs.length})`} />
          <button onClick={handleLogout} className="bg-red-950/20 hover:bg-red-950/50 border border-red-900/40 text-red-400 font-mono text-[10px] px-3 py-2 rounded-lg transition-all ml-auto xl:ml-4 cursor-pointer">TERMINATE</button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12">
        <div className="bg-[#090909] border border-neutral-900 p-5 rounded-xl font-mono shadow-md">
          <span className="text-[8px] text-neutral-500 uppercase tracking-widest block mb-1">Accumulated Views</span>
          <span className="text-2xl font-black text-white">{stats.views}</span>
        </div>
        <div className="bg-[#090909] border border-neutral-900 p-5 rounded-xl font-mono shadow-md">
          <span className="text-[8px] uppercase tracking-widest block mb-1 text-blue-500">Total Link Redirections</span>
          <span className="text-2xl font-black text-blue-400">{stats.liveClicks}</span>
        </div>
        <div className="bg-[#090909] border border-neutral-900 p-5 rounded-xl font-mono shadow-md">
          <span className="text-[8px] uppercase tracking-widest block mb-1 text-purple-500">Repository Fetches</span>
          <span className="text-xl font-black text-purple-400">{stats.codeClicks}</span>
        </div>
        <div className="bg-[#090909] border border-neutral-950 p-5 rounded-xl font-mono shadow-md relative overflow-hidden group">
          <span className="text-[8px] uppercase tracking-widest block mb-1 text-emerald-500">Incoming Stream Packets</span>
          <span className="text-2xl font-black text-emerald-400">{bookings.length}</span>
          <span className="absolute right-3 bottom-1 text-[24px] text-emerald-950/30 select-none font-bold font-mono">⚡</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto pb-24">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DEPLOY */}
          {activeTab === "deploy" && (
            <motion.div key="deploy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-7 bg-[#090909] border border-neutral-900 rounded-2xl p-8 shadow-2xl">
                <form onSubmit={handleSubmitProject} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[8px] font-mono text-neutral-500 mb-2 uppercase tracking-widest">Project Name</label>
                      <input type="text" name="title" required value={formData.title} onChange={handleInputChange} className={`w-full bg-[#0d0d0d] border border-neutral-900 rounded-xl px-4 py-3.5 text-xs font-mono focus:outline-none ${accent.focus}`} placeholder="Alpha Platform" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-mono text-neutral-500 mb-2 uppercase tracking-widest">Tech Tags</label>
                      <input type="text" name="tech" required value={formData.tech} onChange={handleInputChange} className={`w-full bg-[#0d0d0d] border border-neutral-900 rounded-xl px-4 py-3.5 text-xs font-mono focus:outline-none ${accent.focus}`} placeholder="NEXT.JS // TRPC" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-mono text-neutral-500 mb-2 uppercase tracking-widest">Description</label>
                    <textarea rows={4} name="desc" required value={formData.desc} onChange={handleInputChange} className={`w-full bg-[#0d0d0d] border border-neutral-900 rounded-xl px-4 py-3.5 text-xs font-mono focus:outline-none focus:border-neutral-700 resize-none ${accent.focus}`} placeholder="Enter system node parameters..." />
                  </div>

                  {/* DYNAMIC ROTATING TEXT NODES */}
                  <div className="space-y-4 border border-dashed border-neutral-900 p-4 rounded-xl bg-[#050505]/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block">// Rotating Text Nodes</span>
                        <span className="text-[7px] font-mono text-neutral-600 uppercase">Words that animate next to the hero image</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={addRotatingWord} 
                        className={`font-mono text-[9px] border px-2 py-1 rounded cursor-pointer transition-colors ${accent.text} ${accent.border} hover:bg-neutral-900`}
                      >
                        + Add Text Node
                      </button>
                    </div>

                    <div className="space-y-2">
                      {rotatingWords.map((word, idx) => (
                        <div key={word.id} className="flex items-center gap-3 bg-[#0c0c0c]/80 p-2 border border-neutral-900 rounded-lg group transition-all hover:border-neutral-700">
                          <span className="text-[8px] font-mono text-neutral-600 pl-2 w-4">
                            0{idx + 1}
                          </span>
                          <input 
                            type="text" 
                            value={word.text} 
                            onChange={(e) => handleRotatingWordChange(word.id, e.target.value)} 
                            className="flex-1 bg-transparent border-none text-xs font-mono text-white focus:outline-none placeholder-neutral-700" 
                            placeholder="e.g. React.js / Tailwind CSS..." 
                            required
                          />
                          <button 
                            type="button" 
                            onClick={() => removeRotatingWord(word.id)} 
                            className="text-red-900 hover:text-red-500 font-mono text-[9px] px-2 py-1 opacity-50 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            [ PURGE ]
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
{/* DYNAMIC & OPTIONAL IMAGES INPUT BLOCK */}
                  <div className="space-y-4 border border-dashed border-neutral-900 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">// Optional Image Nodes</span>
                      <button type="button" onClick={addImageField} className={`font-mono text-[9px] border px-2 py-1 rounded cursor-pointer ${accent.text} ${accent.border}`}>+ Add Alternate Image</button>
                    </div>

                    {imageFields.map((field, idx) => (
                      <div key={field.id} className="bg-[#0c0c0c]/80 p-3 border border-neutral-900 rounded-lg space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono text-neutral-600">Image Node #{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex bg-neutral-950 p-0.5 rounded border border-neutral-900 text-[8px] font-mono">
                              <button type="button" onClick={() => handleDynamicTypeChange("url", field.id, "image")} className={`px-1.5 py-0.5 rounded ${field.type === "url" ? "bg-neutral-800 text-white" : "text-neutral-500"}`}>URL</button>
                              <button type="button" onClick={() => handleDynamicTypeChange("file", field.id, "image")} className={`px-1.5 py-0.5 rounded ${field.type === "file" ? "bg-neutral-800 text-white" : "text-neutral-500"}`}>FILE</button>
                            </div>
                            <button type="button" onClick={() => removeImageField(field.id)} className="text-red-500 hover:text-red-400 font-mono text-[9px] cursor-pointer">[ PURGE ]</button>
                          </div>
                        </div>
                        {field.type === "url" ? (
                          <input type="text" value={field.url} onChange={(e) => handleDynamicUrlChange(e.target.value, field.id, "image")} className="w-full bg-[#0d0d0d] border border-neutral-900 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none" placeholder="https://image-source.com/..." />
                        ) : (
                          <input type="file" accept="image/*" onChange={(e) => handleDynamicFileChange(e, field.id, "image")} className="w-full bg-[#0d0d0d] border border-neutral-900 rounded-lg px-3 py-1.5 text-xs text-neutral-500 file:bg-neutral-900 file:text-white file:border-0 file:text-[8px] file:font-mono file:rounded file:px-3 file:py-1 cursor-pointer" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* DYNAMIC & OPTIONAL VIDEOS INPUT BLOCK */}
                  <div className="space-y-4 border border-dashed border-neutral-900 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">// Optional Video Nodes</span>
                      <button type="button" onClick={addVideoField} className={`font-mono text-[9px] border px-2 py-1 rounded cursor-pointer ${accent.text} ${accent.border}`}>+ Add Alternate Video</button>
                    </div>

                    {videoFields.map((field, idx) => (
                      <div key={field.id} className="bg-[#0c0c0c]/80 p-3 border border-neutral-900 rounded-lg space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono text-neutral-600">Video Node #{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex bg-neutral-950 p-0.5 rounded border border-neutral-900 text-[8px] font-mono">
                              <button type="button" onClick={() => handleDynamicTypeChange("url", field.id, "video")} className={`px-1.5 py-0.5 rounded ${field.type === "url" ? "bg-neutral-800 text-white" : "text-neutral-500"}`}>URL</button>
                              <button type="button" onClick={() => handleDynamicTypeChange("file", field.id, "video")} className={`px-1.5 py-0.5 rounded ${field.type === "file" ? "bg-neutral-800 text-white" : "text-neutral-500"}`}>FILE</button>
                            </div>
                            <button type="button" onClick={() => removeVideoField(field.id)} className="text-red-500 hover:text-red-400 font-mono text-[9px] cursor-pointer">[ PURGE ]</button>
                          </div>
                        </div>
                        {field.type === "url" ? (
                          <input type="text" value={field.url} onChange={(e) => handleDynamicUrlChange(e.target.value, field.id, "video")} className="w-full bg-[#0d0d0d] border border-neutral-900 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none" placeholder="https://video-source.com/..." />
                        ) : (
                          <input type="file" accept="video/*" onChange={(e) => handleDynamicFileChange(e, field.id, "video")} className="w-full bg-[#0d0d0d] border border-neutral-900 rounded-lg px-3 py-1.5 text-xs text-neutral-500 file:bg-neutral-900 file:text-white file:border-0 file:text-[8px] file:font-mono file:rounded file:px-3 file:py-1 cursor-pointer" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[8px] font-mono text-neutral-500 mb-2 uppercase tracking-widest">Live Link</label>
                      <input type="text" name="liveLink" required value={formData.liveLink} onChange={handleInputChange} className="w-full bg-[#0d0d0d] border border-neutral-900 rounded-xl px-4 py-3.5 text-xs font-mono focus:outline-none focus:border-neutral-700" placeholder="https://" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-mono text-neutral-500 mb-2 uppercase tracking-widest">GitHub Link</label>
                      <input type="text" name="githubLink" required value={formData.githubLink} onChange={handleInputChange} className="w-full bg-[#0d0d0d] border border-neutral-900 rounded-xl px-4 py-3.5 text-xs font-mono focus:outline-none focus:border-neutral-700" placeholder="https://" />
                    </div>
                  </div>

                  <button type="submit" disabled={uploading} className="w-full font-mono text-xs font-bold tracking-widest py-4 rounded-xl bg-white text-black hover:bg-neutral-200 transition-all mt-4 cursor-pointer uppercase disabled:opacity-50">
                    {uploading ? "SYNCING WITH CLOUD..." : "// INJECT NODE TO SYSTEM"}
                  </button>
                </form>
              </div>

              {/* Realtime Preview */}
              <div className="lg:col-span-5 bg-[#090909] border border-neutral-900 p-6 rounded-2xl space-y-6 sticky top-6">
                <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest block">// REALTIME_PREVIEW_NODE</span>
                <div className="space-y-2">
                  <span className="text-[8px] font-mono text-neutral-600 block uppercase tracking-wider">[Primary Image Buffer]</span>
                  <div className="bg-[#030303] border border-neutral-900 rounded-lg overflow-hidden h-44 flex items-center justify-center relative">
                    {(imageFields[0]?.preview || imageFields[0]?.url) ? (
                      <img src={imageFields[0]?.preview || imageFields[0]?.url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-mono text-neutral-700">// NO_SIGNAL (Optional)</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[8px] font-mono text-neutral-600 block uppercase tracking-wider">[Primary Video Buffer]</span>
                  <div className="bg-[#030303] border border-neutral-900 rounded-lg overflow-hidden h-44 flex items-center justify-center">
                    {(videoFields[0]?.preview || videoFields[0]?.url) ? (
                      <video key={videoFields[0]?.preview || videoFields[0]?.url} src={videoFields[0]?.preview || videoFields[0]?.url} controls autoPlay loop muted className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-mono text-neutral-700">// NO_SIGNAL (Optional)</span>
                    )}
                  </div>
                </div>
                <div className="pt-2">
                  <h4 className="text-base font-black font-mono tracking-tight text-white">{formData.title || "Blueprint Module"}</h4>
                  <p className="text-xs font-mono text-neutral-600 mt-1 uppercase tracking-wider">{formData.tech || "TECH_STACK"}</p>
                  <p className="text-xs text-neutral-400 mt-3 line-clamp-4 font-sans leading-relaxed">{formData.desc || "Awaiting structural parameters..."}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MANAGE PROJECTS */}
          {activeTab === "manage" && (
            <motion.div key="manage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-4">// DEPLOYED_NODES_REGISTRY</span>
              
              {projects.length === 0 ? (
                <div className="bg-[#090909] border border-neutral-900 p-8 rounded-xl text-center font-mono text-xs text-neutral-600">
                  // EMPTY_REGISTRY
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-[#090909] border border-neutral-900 rounded-xl overflow-hidden flex flex-col group shadow-lg transition-transform hover:-translate-y-1">
                      <div className="h-44 relative bg-black overflow-hidden border-b border-neutral-900 flex-shrink-0">
                        <img src={project.image} alt={project.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                        <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[9px] font-mono text-neutral-300 border border-neutral-800 backdrop-blur-md">
                          👁 {project.views} | ⭐ {project.reviews.length} | 🖼️ {(project.images?.length || 1)}
                        </div>
                      </div>
                      <div className="p-5 flex flex-col flex-grow">
                        <span className="text-[10px] font-mono text-blue-500 tracking-widest block mb-1">{project.tech}</span>
                        <h3 className="text-lg font-bold text-white mb-2">{project.title}</h3>
                        <p className="text-xs text-neutral-500 font-sans line-clamp-3 mb-5 flex-grow leading-relaxed">{project.desc}</p>
                        <button onClick={() => handleDeleteProject(project.id)} className="w-full bg-red-950/20 hover:bg-red-900 border border-red-900/40 hover:text-white text-red-400 font-mono text-[10px] py-2.5 rounded-lg transition-all cursor-pointer">
                          DELETE NODE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: METRICS */}
          {activeTab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-[#090909] border border-neutral-900 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block">// TELEMETRY_DATABASE</span>
                <button 
                  onClick={handleExportRegistry}
                  className="font-mono text-[9px] bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  [ EXPORT_REGISTRY_JSON ]
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-neutral-900 text-neutral-500 text-[10px] uppercase">
                      <th className="py-3 px-2">Project</th>
                      <th className="py-3 px-2">Views</th>
                      <th className="py-3 px-2">Live Redirects</th>
                      <th className="py-3 px-2">Git Fetches</th>
                      <th className="py-3 px-2">Reviews</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-neutral-300">
                    {projects.map(p => (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-2 text-white font-bold">{p.title}</td>
                        <td className="py-4 px-2">👁️ {p.views}</td>
                        <td className="py-4 px-2 text-blue-400">↗️ {p.liveClicks}</td>
                        <td className="py-4 px-2 text-purple-400">📦 {p.codeClicks}</td>
                        <td className="py-4 px-2 text-yellow-500">⭐ {p.reviews.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 4: REVIEWS */}
          {activeTab === "reviews" && (
            <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block px-1">// GLOBAL_AUDIT_FEEDBACK</span>
              
              {allReviews.length === 0 ? (
                <div className="bg-[#090909] border border-neutral-900 p-8 rounded-xl text-center font-mono text-xs text-neutral-600">
                  // LOG_CLEAN: NO_REVIEWS_FOUND
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {allReviews.map((rev) => (
                    <div key={rev.id} className="bg-[#090909] border border-neutral-900 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                          <span className="text-white font-black text-xs">{rev.user}</span>
                          {rev.clientType && <span className="bg-neutral-950 border border-neutral-800 text-blue-400 px-1.5 py-0.5 rounded text-[8px]">{rev.clientType}</span>}
                          <span className="text-neutral-600">on:</span>
                          <span className="text-neutral-400 underline">{rev.projectTitle}</span>
                          <span className="text-yellow-500 ml-auto md:ml-2">{"★".repeat(rev.rating)}</span>
                        </div>
                        <p className="text-xs text-neutral-300 font-sans leading-relaxed">{rev.comment}</p>
                        
                        {(rev.uiRating || rev.codeQualityRating) && (
                          <div className="flex gap-4 font-mono text-[8px] text-neutral-500 pt-1">
                            {rev.uiRating && <span>UI_METRIC: <span className="text-neutral-300">{rev.uiRating}/5</span></span>}
                            {rev.codeQualityRating && <span>CODE_METRIC: <span className="text-neutral-300">{rev.codeQualityRating}/5</span></span>}
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleAdminDeleteReview(rev.projectId, rev)}
                        className="bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-500 text-red-400 font-mono text-[10px] py-2.5 px-4 rounded-lg transition-colors cursor-pointer whitespace-nowrap self-start md:self-auto"
                      >
                        PURGE 🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 5: RESERVATIONS & QUICK RESPONSE BRIDGE */}
          {activeTab === "reservations" && (
            <motion.div key="reservations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block px-1">// LIVE_RESERVATIONS_DATA_STREAM</span>
              
              {bookings.length === 0 ? (
                <div className="bg-[#090909] border border-neutral-900 p-8 rounded-xl text-center font-mono text-xs text-neutral-600">
                  // NO_STREAMING_DATA_PACKETS_AVAILABLE
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bookings.map((booking) => {
                    const isCall = booking.type === "CALL_RESERVATION";
                    
                    // Pre-compiled quick messages
                    const emailSubject = encodeURIComponent("Matrix Connection: Transmission Response");
                    const emailBody = encodeURIComponent(`Hello Operator,\nWe processed your packet transmission context from database logs.\n\nBest regards,\nAdmin Terminal`);
                    const whatsappMsg = encodeURIComponent("Greetings, we traced your connection packet from our matrix dashboard. Let's arrange a secure link sync.");

                    return (
                      <div key={booking.id} className={`bg-[#090909] border ${isCall ? "border-emerald-950/60" : "border-blue-950/60"} p-5 rounded-xl flex flex-col justify-between gap-4 shadow-xl relative overflow-hidden`}>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border ${isCall ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" : "bg-blue-950/40 text-blue-400 border-blue-900/50"}`}>
                              {isCall ? "⚡ CALL_MATRIX_RESERVATION" : "📨 DIRECT_PACKET_MSG"}
                            </span>
                            <span className="font-mono text-[8px] text-neutral-600">
                              {new Date(booking.createdAt).toLocaleString("en-US")}
                            </span>
                          </div>

                          {isCall ? (
                            <div className="space-y-1.5 font-mono text-xs">
                              <p className="text-white"><span className="text-neutral-500">CLIENT:</span> {booking.payload.name}</p>
                              <p className="text-blue-400"><span className="text-neutral-500">SECURE_MAIL:</span> {booking.payload.email}</p>
                              <p className="text-amber-400"><span className="text-neutral-500">TARGET_DATE:</span> {booking.payload.date} @ {booking.payload.time}</p>
                              <div className="bg-[#050505] p-3 border border-neutral-900 rounded-lg text-neutral-400 font-sans mt-2 text-xs">
                                <span className="font-mono text-[9px] text-neutral-600 block mb-1">// BRIEFING:</span>
                                {booking.payload.reason}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5 font-mono text-xs">
                              <p className="text-blue-400"><span className="text-neutral-500">FROM_NODE:</span> {booking.payload.email}</p>
                              {booking.payload.phone && <p className="text-neutral-300"><span className="text-neutral-500">PHONE_LINE:</span> {booking.payload.phone}</p>}
                              <p className="text-xs">
                                <span className="text-neutral-500">WHATSAPP_NODE:</span> {booking.payload.whatsapp ? "🟢 ESTABLISHED" : "🔴 DISABLED"}
                              </p>
                              <div className="bg-[#050505] p-3 border border-neutral-900 rounded-lg text-neutral-300 font-sans mt-2 text-xs leading-relaxed">
                                <span className="font-mono text-[9px] text-neutral-600 block mb-1">// MESSAGE_PAYLOAD:</span>
                                {booking.payload.message}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Quick Response Action Bridge */}
                        <div className="pt-2 border-t border-neutral-900 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex gap-2 font-mono text-[8px]">
                            <a 
                              href={`mailto:${booking.payload.email}?subject=${emailSubject}&body=${emailBody}`}
                              onClick={() => pushLog(`RESPONSE_BRIDGE: Initiated encrypted email node reply to [${booking.payload.email}]`)}
                              className="bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              [ INJECT_MAIL ]
                            </a>
                            {booking.payload.phone && (
                              <a 
                                href={`https://wa.me/${booking.payload.phone.replace(/\+/g, '')}?text=${whatsappMsg}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => pushLog(`RESPONSE_BRIDGE: Opened WhatsApp bridge link node to [${booking.payload.phone}]`)}
                                className="bg-emerald-950/20 border border-emerald-900/60 text-emerald-400 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                [ INJECT_WHATSAPP ]
                              </a>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="bg-red-950/10 hover:bg-red-900 border border-red-900/40 text-red-400 hover:text-white font-mono text-[9px] tracking-widest py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                          >
                            DESTRUCT PACKET
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 6: SYSTEM AUDIT LOGS */}
          {activeTab === "logs" && (
            <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-[#090909] border border-neutral-900 rounded-2xl p-6 shadow-2xl font-mono text-xs">
              <div className="flex items-center justify-between border-b border-neutral-950 pb-4 mb-4">
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">// CORE_AUDIT_TRAIL_HISTORY</span>
                <button 
                  onClick={() => { setLogs([]); showToast("LOGS_CLEARED"); }} 
                  className="text-[9px] text-red-400 hover:text-red-300 bg-red-950/10 border border-red-900/40 px-2 py-1 rounded cursor-pointer"
                >
                  [ FLUSH_ALL_LOGS ]
                </button>
              </div>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-900">
                {logs.map((log) => {
                  const colors = {
                    info: "text-neutral-500",
                    success: "text-emerald-400",
                    warn: "text-amber-500",
                    crit: "text-red-500 font-bold"
                  }[log.type];

                  return (
                    <div key={log.id} className="flex items-start gap-4 py-1 border-b border-neutral-950 text-[11px] leading-relaxed select-none">
                      <span className="text-neutral-600 flex-shrink-0">[{log.time}]</span>
                      <span className={`${colors} break-all`}>{log.msg}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}