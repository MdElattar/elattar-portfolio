"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";


interface NavigationProps {
  activeSection?: number;
  onSectionChange?: (index: number) => void;
}

interface TerminalNotification {
  type: "success" | "error" | null;
  message: string;
}

interface CertificateType {
  id: number;
  title: string;
  issuer: string;
  year: string;
  isMinistry: boolean;
  desc: string;
  imgUrl: string;
}

const ALL_POSSIBLE_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

const ATTENTION_PROMPTS = [
  { target: "projects", message: "🔥 VIEW RECENT PROJECTS" },
  { target: "contact", message: "⚡ LIVE CONTACT LINK" },
  { target: "credentials", message: "🎓 VIEW CYBER CREDENTIALS" },
  { target: "projects", message: "🚀 DISCOVER MY WORK" },
  { target: "credentials", message: "✨ MINISTRY CERTIFICATE INSIDE" },
];

// بيانات شهاداتك الحقيقية مع مسارات الصور الخاصة بها
const CERTIFICATES: CertificateType[] = [
  {
    id: 1,
    title: "Digital Egypt Cubs Initiative - Summer Camp (Second Batch 23/24)",
    issuer: "Ministry of Communications & Information Technology",
    year: "2024",
    isMinistry: true,
    desc: "Premium Award Certificate of Achievement recognizing extensive technical accomplishments, managed by almentor.",
    imgUrl: "/certificates/ministry_deci.png", // قم بوضع الصورة الحقيقية في هذا المسار بمجلد public
  },
  {
    id: 2,
    title: "Front End Developer Core Training",
    issuer: "SQUARE TRAINING CENTER",
    year: "2024",
    isMinistry: false,
    desc: "Comprehensive certification verifying mastery over HTML, CSS, JavaScript, Bootstrap, React.js, ECMAScript6, Ajax, JSON, and API Architectures.",
    imgUrl: "/certificates/frontend_square.png", // قم بوضع الصورة الحقيقية في هذا المسار بمجلد public
  },
  {
    id: 3,
    title: "Python Course",
    issuer: "Novel ACADEMY",
    year: "2023",
    isMinistry: false,
    desc: "Developed a solid foundation in Python programming, mastering core logic structures, advanced data structures, and functional programming to solve complex computational problems.",
    imgUrl: "/certificates/python_novel.png", // قم بوضع الصورة الحقيقية في هذا المسار بمجلد public
  },
  {
    id: 4,
    title: "Python Course with Advanced Projects",
    issuer: "Novel ACADEMY",
    year: "2023",
    isMinistry: false,
    desc: "Successfully built and deployed real-world software modules including calculators, currency exchange backends, and advanced library systems.",
    imgUrl: "/certificates/python_novel_projects.png", // قم بوضع الصورة الحقيقية في هذا المسار بمجلد public
  },
];

export default function Navigation({
  activeSection = 0,
  onSectionChange,
}: NavigationProps) {
  const [time, setTime] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isCVOpen, setIsCVOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"call" | "message">("call");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notification, setNotification] = useState<TerminalNotification>({
    type: null,
    message: "",
  });

  const [activeBubble, setActiveBubble] = useState<{
    target: string;
    message: string;
  } | null>(null);

  // حالة التحكم بالـ Lightbox الخاص بالشهادات لمنع تداخل الشاشات
  const [selectedCertImg, setSelectedCertImg] = useState<string | null>(null);
  const [imgLoadingError, setImgLoadingError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [theme, setTheme] = useState("dark");

  const { currentYear, currentMonth, currentDate } = useMemo(() => {
    const today = new Date();
    return {
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth(),
      currentDate: today.getDate(),
    };
  }, []);

  const [selectedDate, setSelectedDate] = useState<number | null>(currentDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

   useEffect(() => {
    // التأكد من الثيم المحفوظ سابقاً
    const savedTheme = localStorage.getItem("portfolio-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    // السطر السحري الذي يغير الألوان في ملف الـ CSS
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("portfolio-theme", nextTheme);
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    reason: "",
    phone: "",
    whatsapp: true,
    message: "",
  });

  const [bookedSlotsDatabase, setBookedSlotsDatabase] = useState<{
    [key: number]: string[];
  }>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // تدوير الإشعارات التلقائية فوق الأيقونات بشكل ذكي
  useEffect(() => {
    if (!isMounted) return;

    const interval = setInterval(() => {
      if (isContactOpen || isCVOpen || isDrawerOpen || selectedCertImg) {
        setActiveBubble(null);
        return;
      }

      const randomIndex = Math.floor(Math.random() * ATTENTION_PROMPTS.length);
      setActiveBubble(ATTENTION_PROMPTS[randomIndex]);

      setTimeout(() => {
        setActiveBubble(null);
      }, 3500);
    }, 6500);

    return () => clearInterval(interval);
  }, [isMounted, isContactOpen, isCVOpen, isDrawerOpen, selectedCertImg]);

  const parseSlotTo24H = (slot: string): number => {
    const match = slot.match(/(\d+):00\s+(AM|PM)/);
    if (!match) return 0;
    let hour = parseInt(match[1]);
    const ampm = match[2];
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return hour;
  };

  const getCairoCurrentHour = (): number => {
    try {
      const options = {
        timeZone: "Africa/Cairo",
        hour: "2-digit",
        hour12: false,
      } as const;
      return parseInt(new Date().toLocaleTimeString("en-US", options));
    } catch (e) {
      return new Date().getHours();
    }
  };

  useEffect(() => {
    if (isMounted && isContactOpen && activeTab === "call") {
      const fetchBookings = async () => {
        setLoadingSlots(true);
        try {
          const q = query(
            collection(db, "bookings"),
            where("type", "==", "CALL_RESERVATION"),
          );
          const querySnapshot = await getDocs(q);
          const slotsMapping: { [key: number]: string[] } = {};

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.payload && data.payload.date) {
              const bookingDate = new Date(data.payload.date);
              if (
                bookingDate.getMonth() === currentMonth &&
                bookingDate.getFullYear() === currentYear
              ) {
                const dayNum = bookingDate.getDate();
                if (!slotsMapping[dayNum]) {
                  slotsMapping[dayNum] = [];
                }
                slotsMapping[dayNum].push(data.payload.time);
              }
            }
          });

          setBookedSlotsDatabase(slotsMapping);
        } catch (error) {
          console.error("Error fetching bookings securely:", error);
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchBookings();
    }
  }, [isContactOpen, activeTab, currentMonth, currentYear, isMounted]);

  useEffect(() => {
    if (notification.type) {
      const timer = setTimeout(
        () => setNotification({ type: null, message: "" }),
        5000,
      );
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const getAvailableSlotsForDate = (day: number) => {
    const bookedSlots = bookedSlotsDatabase[day] || [];
    let slots = ALL_POSSIBLE_SLOTS.filter(
      (slot) => !bookedSlots.includes(slot),
    );
    if (day === currentDate) {
      const currentCairoHour = getCairoCurrentHour();
      slots = slots.filter((slot) => parseSlotTo24H(slot) > currentCairoHour);
    }
    return slots;
  };

  const availableSlotsForSelectedDate = selectedDate
    ? getAvailableSlotsForDate(selectedDate)
    : [];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayIndex }, (_, i) => i);
  const monthNames = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
  ];

  const dockRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const cvModalRef = useRef<HTMLDivElement>(null);

  const modalX = useMotionValue(0);
  const modalY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 180, mass: 0.6 };
  const rotateXSpring = useSpring(
    useTransform(modalY, [-300, 300], [8, -8]),
    springConfig,
  );
  const rotateYSpring = useSpring(
    useTransform(modalX, [-300, 300], [-8, 8]),
    springConfig,
  );

  const dockX = useMotionValue(0);
  const dockY = useMotionValue(0);
  const dockRotateX = useSpring(
    useTransform(dockY, [-80, 80], [12, -12]),
    springConfig,
  );
  const dockRotateY = useSpring(
    useTransform(dockX, [-150, 150], [-12, 12]),
    springConfig,
  );

  const handleDockMouseMove = (e: React.MouseEvent) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    dockX.set(e.clientX - rect.left - rect.width / 2);
    dockY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleModalMouseMove = (
    e: React.MouseEvent,
    ref: React.RefObject<HTMLDivElement | null>,
  ) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    modalX.set(e.clientX - rect.left - rect.width / 2);
    modalY.set(e.clientY - rect.top - rect.height / 2);
  };

  useEffect(() => {
    const updateClock = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Africa/Cairo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      setTime(new Date().toLocaleTimeString("en-US", options));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (index: number, id: string) => {
    if (onSectionChange) {
      onSectionChange(index);
    } else {
      const element = document.getElementById(id);
      if (element)
        element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification({ type: null, message: "" });
    const isCall = activeTab === "call";
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;

    const finalPayload = isCall
      ? {
          type: "CALL_RESERVATION",
          createdAt: new Date().toISOString(),
          payload: {
            date: formattedDate,
            time: selectedTime,
            name: formData.name,
            email: formData.email,
            reason: formData.reason,
          },
        }
      : {
          type: "DIRECT_MESSAGE",
          createdAt: new Date().toISOString(),
          payload: {
            email: formData.email,
            phone: formData.phone,
            whatsapp: formData.whatsapp,
            message: formData.message,
          },
        };

    try {
      await addDoc(collection(db, "bookings"), finalPayload);
      setFormData({
        name: "",
        email: "",
        reason: "",
        phone: "",
        whatsapp: true,
        message: "",
      });
      setSelectedTime(null);
      setNotification({
        type: "success",
        message: isCall
          ? "SUCCESS: Call matrix reservations successfully synced."
          : "SUCCESS: Direct message packets distributed.",
      });
      setTimeout(() => setIsContactOpen(false), 2000);
    } catch (error: any) {
      setNotification({
        type: "error",
        message: `ABORTED: Transmission stream lost. Code ${error.code || "unknown"}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections = [
    {
      label: "HOME",
      id: "home",
      index: 0,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: "STACK",
      id: "skills",
      index: 1,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 12 12 17 22 12" />
          <polyline points="2 17 12 22 22 17" />
        </svg>
      ),
    },
    {
      label: "PROJECTS",
      id: "projects",
      index: 2,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      ),
    },
  ];

  if (!isMounted) return null;
 

  return (
    <>
      {/* Top Telemetry Overlay */}
      <div className="fixed top-0 inset-x-0 z-40 px-4 sm:px-6 py-4 flex justify-between items-center pointer-events-none font-mono text-[10px] tracking-[0.2em] text-neutral-500 select-none">
        <div className="flex items-center gap-2 bg-[#030303]/70 backdrop-blur-md border border-neutral-900 px-3 py-1.5 rounded-full pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
          </span>
          <span className="text-neutral-300 font-bold text-[8px] tracking-[0.25em]">
            OPERATIONAL_STATUS: ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-2 bg-[#030303]/70 backdrop-blur-md border border-neutral-900 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-auto group hover:border-neutral-800 transition-colors">
          <span className="text-neutral-500 text-[8px] font-bold tracking-widest uppercase group-hover:text-blue-500 transition-colors">
            CAI //
          </span>
          <span className="text-neutral-200 font-bold tracking-normal">
            {time || "00:00:00"}
          </span>
        </div>
      </div>

      {/* Cyber Responsive Floating Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max [perspective:1000px]">
        <motion.div
          ref={dockRef}
          onMouseMove={handleDockMouseMove}
          onMouseLeave={() => {
            dockX.set(0);
            dockY.set(0);
          }}
          style={{
            rotateX: dockRotateX,
            rotateY: dockRotateY,
            transformStyle: "preserve-3d",
          }}
          className="bg-[#030303]/80 backdrop-blur-xl border border-neutral-900/80 px-4 py-2.5 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex items-center gap-3 sm:gap-4 transition-all duration-300 hover:border-neutral-800"
        >
          <nav
            className="flex items-center gap-3 sm:gap-4"
            style={{ transform: "translateZ(15px)" }}
          >
            {sections.map((item) => {
              const isActive =
                activeSection === item.index &&
                !isContactOpen &&
                !isCVOpen &&
                !isDrawerOpen;
              const hasBubble = activeBubble?.target === item.id;

              return (
                <div
                  key={item.id}
                  className="relative group flex flex-col items-center"
                >
                  <AnimatePresence>
                    {hasBubble && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: -45 }}
                        exit={{ opacity: 0, scale: 0.6, y: 10 }}
                        className="absolute bg-blue-600 border border-blue-400 text-white text-[8px] font-mono font-black tracking-widest px-2.5 py-1 rounded-md shadow-[0_0_15px_rgba(59,130,246,0.6)] whitespace-nowrap z-50 pointer-events-none"
                      >
                        {activeBubble?.message}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-600" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300 pointer-events-none z-20">
                    <div className="bg-black border border-neutral-800 text-white text-[9px] font-mono font-bold tracking-widest px-3 py-1.5 rounded-md shadow-xl whitespace-nowrap">
                      {item.label}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsContactOpen(false);
                      setIsCVOpen(false);
                      setIsDrawerOpen(false);
                      handleNavClick(item.index, item.id);
                    }}
                    className={`relative p-2.5 rounded-xl cursor-pointer transition-colors duration-300 ${
                      isActive
                        ? "text-white bg-white/10"
                        : "text-neutral-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="relative z-10 block">{item.icon}</span>
                    {isActive && (
                      <motion.span
                        layoutId="dockGlowPulse"
                        className="absolute inset-0 border border-neutral-700 rounded-xl z-0 shadow-inner"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 28,
                        }}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* 🎓 Cyber Drawer Button [ CREDENTIALS ] */}
          <div
            className="relative group flex flex-col items-center"
            style={{ transform: "translateZ(20px)" }}
          >
            <AnimatePresence>
              {activeBubble?.target === "credentials" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: -45 }}
                  exit={{ opacity: 0, scale: 0.6, y: 10 }}
                  className="absolute bg-amber-600 border border-amber-400 text-white text-[8px] font-mono font-black tracking-widest px-2.5 py-1 rounded-md shadow-[0_0_15px_rgba(245,158,11,0.6)] whitespace-nowrap z-50 pointer-events-none"
                >
                  {activeBubble?.message}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-600" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300 pointer-events-none z-20">
              <div className="bg-black border border-neutral-800 text-white text-[9px] font-mono font-bold tracking-widest px-3 py-1.5 rounded-md shadow-xl whitespace-nowrap">
                CREDENTIALS
              </div>
            </div>
            <button
              onClick={() => {
                setIsDrawerOpen(!isDrawerOpen);
                setIsContactOpen(false);
                setIsCVOpen(false);
              }}
              className={`relative p-2.5 rounded-xl cursor-pointer transition-colors duration-300 ${isDrawerOpen ? "text-amber-400 bg-amber-400/10" : "text-neutral-500 hover:text-amber-400 hover:bg-white/5"}`}
            >
              <span className="relative z-10 block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                </svg>
              </span>
            </button>
          </div>
          <div className="h-6 w-[1px] bg-neutral-800/80" />

          {/* CV Button */}
          <div
            className="relative group flex flex-col items-center"
            style={{ transform: "translateZ(20px)" }}
          >
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300 pointer-events-none z-20">
              <div className="bg-black border border-neutral-800 text-white text-[9px] font-mono font-bold tracking-widest px-3 py-1.5 rounded-md shadow-xl whitespace-nowrap">
                DIGITAL_CV
              </div>
            </div>
            <button
              onClick={() => {
                setIsCVOpen(!isCVOpen);
                setIsContactOpen(false);
                setIsDrawerOpen(false);
              }}
              className={`relative p-2.5 rounded-xl cursor-pointer transition-colors duration-300 ${isCVOpen ? "text-emerald-400 bg-emerald-400/10" : "text-neutral-500 hover:text-emerald-400 hover:bg-white/5"}`}
            >
              <span className="relative z-10 block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
            </button>
          </div>

          {/* Contact Button */}
          <div
            className="relative group flex flex-col items-center"
            style={{ transform: "translateZ(20px)" }}
          >
            <AnimatePresence>
              {activeBubble?.target === "contact" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: -45 }}
                  exit={{ opacity: 0, scale: 0.6, y: 10 }}
                  className="absolute bg-indigo-600 border border-indigo-400 text-white text-[8px] font-mono font-black tracking-widest px-2.5 py-1 rounded-md shadow-[0_0_15px_rgba(79,70,229,0.6)] whitespace-nowrap z-50 pointer-events-none"
                >
                  {activeBubble?.message}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-indigo-600" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300 pointer-events-none z-20">
              <div className="bg-black border border-neutral-800 text-white text-[9px] font-mono font-bold tracking-widest px-3 py-1.5 rounded-md shadow-xl whitespace-nowrap">
                COMM_LINK
              </div>
            </div>
            <button
              onClick={() => {
                setIsContactOpen(!isContactOpen);
                setIsCVOpen(false);
                setIsDrawerOpen(false);
              }}
              className={`relative p-2.5 rounded-xl cursor-pointer transition-colors duration-300 ${isContactOpen ? "text-blue-500 bg-blue-500/10" : "text-neutral-500 hover:text-blue-500 hover:bg-white/5"}`}
            >
              <span className="relative z-10 block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* 🎓 Cyber Drawer Component (عرض الشهادات الحقيقية الثلاثة) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center backdrop-blur-md bg-black/70">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setIsDrawerOpen(false)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="relative w-full max-w-5xl h-[80vh] bg-[#030303]/90 backdrop-blur-2xl border-t border-x border-neutral-800 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-10"
            >
              <div
                className="w-full flex justify-center py-3 cursor-pointer"
                onClick={() => setIsDrawerOpen(false)}
              >
                <div className="w-16 h-1 bg-neutral-800 rounded-full hover:bg-neutral-600 transition-colors" />
              </div>

              <div className="flex items-center justify-between px-6 pb-4 border-b border-neutral-900">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] tracking-[0.25em] font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  VERIFIED_CREDENTIAL_MATRIX // REAL_ARCHIVE
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-900/60 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar text-left">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  {CERTIFICATES.map((cert) => (
                    <div
                      key={cert.id}
                      className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                        cert.isMinistry
                          ? "bg-gradient-to-b from-amber-950/20 to-black border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)] md:col-start-2 md:row-start-1 md:scale-105 z-10 border-2"
                          : "bg-black/40 border-neutral-900 hover:border-neutral-800"
                      }`}
                    >
                      {cert.isMinistry && (
                        <div className="absolute -top-3 left-6 bg-amber-500 text-black font-mono text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-md shadow-md uppercase">
                          ⭐ HIGHLIGHTED // MINISTRY VERIFIED
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <span
                            className={`font-mono text-[9px] font-bold tracking-widest ${cert.isMinistry ? "text-amber-400" : "text-neutral-500"}`}
                          >
                            [{cert.issuer}]
                          </span>
                          <span className="text-neutral-600 font-mono text-[10px]">
                            {cert.year}
                          </span>
                        </div>
                        <div>
                          <h4
                            className={`text-sm font-mono font-bold tracking-tight ${cert.isMinistry ? "text-white text-base" : "text-neutral-200"}`}
                          >
                            {cert.title}
                          </h4>
                          <p className="text-neutral-400 font-mono text-xs mt-2 leading-relaxed">
                            {cert.desc}
                          </p>
                        </div>
                      </div>

                      <div className="pt-6 mt-auto">
                        <button
                          onClick={() => {
                            setSelectedCertImg(cert.imgUrl);
                            setImgLoadingError(false);
                          }}
                          className={`w-full py-2.5 rounded-xl font-mono text-[10px] font-bold tracking-widest border transition-all uppercase cursor-pointer ${
                            cert.isMinistry
                              ? "bg-amber-500 hover:bg-amber-400 text-black border-amber-400"
                              : "bg-transparent border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                          }`}
                        >
                          Validate Node Token // View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🖼️ Cyber Lightbox Modal (تريك العرض الفائق للشهادة الحقيقية بدون أخطاء) */}
      <AnimatePresence>
        {selectedCertImg && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-xl bg-black/90">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => {
                setSelectedCertImg(null);
                setImageLoading(true);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-w-4xl w-full bg-[#050505] border border-neutral-800 rounded-2xl overflow-hidden p-3 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 flex flex-col"
            >
              {/* شريط التحكم العلوي */}
              <div className="flex items-center justify-between pb-2 px-2 border-b border-neutral-900 font-mono text-[9px] text-neutral-500 tracking-widest">
                <span>SYSTEM_SECURE_VIEWER // HIGH_RES_IMAGE</span>
                <button
                  onClick={() => {
                    setSelectedCertImg(null);
                    setImageLoading(true);
                  }}
                  className="text-neutral-400 hover:text-white border border-neutral-800 bg-black/40 px-3 py-1 rounded-md text-[9px] font-mono font-bold transition-all hover:bg-neutral-900 cursor-pointer"
                >
                  CLOSE_INTERFACE [X]
                </button>
              </div>

              {/* حاوية الصورة المستقرة أبعادها */}
              <div className="relative min-h-[300px] max-h-[70vh] w-full flex items-center justify-center overflow-hidden bg-neutral-950 rounded-xl mt-2">
                {/* مؤشر التحميل الذكي لضمان استقرار الواجهة */}
                {imageLoading && !imgLoadingError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 font-mono text-[9px] text-amber-500 tracking-widest animate-pulse">
                    <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                    <span>FETCHING_IMAGE_DATA...</span>
                  </div>
                )}

                {imgLoadingError ? (
                  <div className="text-center p-6 space-y-2 font-mono">
                    <span className="text-red-500 text-xs font-bold block">
                      ⚠️ LINK_STREAM_ERROR_404
                    </span>
                    <span className="text-neutral-600 text-[10px] block">
                      Could not trace token source image. Verify your public
                      assets folder pathway.
                    </span>
                  </div>
                ) : (
                  <img
                    src={selectedCertImg}
                    alt="Verified Academic Certificate Token"
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImgLoadingError(true);
                      setImageLoading(false);
                    }}
                    className={`max-w-full max-h-[68vh] object-contain rounded-lg shadow-2xl transition-all duration-500 ${
                      imageLoading
                        ? "opacity-0 scale-95"
                        : "opacity-100 scale-100 hover:scale-[1.01]"
                    }`}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎓 Cyber CV / Fast Report Modal */}
      <AnimatePresence>
        {isCVOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/80 overflow-y-auto [perspective:1200px]">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setIsCVOpen(false)}
            />

            <motion.div
              ref={cvModalRef}
              onMouseMove={(e) => handleModalMouseMove(e, cvModalRef)}
              onMouseLeave={() => {
                modalX.set(0);
                modalY.set(0);
              }}
              style={{
                rotateX: rotateXSpring,
                rotateY: rotateYSpring,
                transformStyle: "preserve-3d",
              }}
              initial={{ opacity: 0, scale: 0.94, y: 30, rotateX: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 30, filter: "blur(12px)" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative w-full max-w-4xl bg-[#070708] border border-neutral-800/60 rounded-2xl shadow-[0_50px_100px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col font-sans"
            >
              {/* ─── HEADER INTERFACE ─── */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b border-neutral-900 bg-[#0a0a0c]/80"
                style={{ transform: "translateZ(30px)" }}
              >
                <div className="flex items-center gap-3 text-emerald-400 font-mono text-[11px] tracking-[0.2em] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  SECURE_PROFILE_STREAM // METADATA_VERIFIED
                </div>
                <button
                  onClick={() => setIsCVOpen(false)}
                  className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-900/60 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* ─── MAIN WORKSPACE CONTENT ─── */}
              <div
                className="p-6 md:p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar"
                style={{ transform: "translateZ(20px)" }}
              >
                {/* SECTION 1: IDENTITY & HERO PROFILE */}
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left border-b border-neutral-900 pb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-950 p-[1px] shadow-xl">
                      <div className="w-full h-full rounded-2xl bg-[#0c0c0e] flex items-center justify-center overflow-hidden">
                        {/* استبدل هذا الجزء بصورتك الشخصية الحقيقية لاحقاً إذا أردت */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1}
                          stroke="currentColor"
                          className="w-10 h-10 text-neutral-600"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <h2 className="text-white text-2xl font-bold font-mono tracking-tight uppercase">
                        Mohamed Elattar
                      </h2>
                      <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full self-center md:self-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 font-mono text-[9px] font-bold tracking-widest uppercase">
                          AVAILABLE FOR CORE INFRASTRUCTURE
                        </span>
                      </div>
                    </div>
                    <p className="text-neutral-400 font-mono text-xs tracking-widest uppercase">
                      Full-Stack Software Engineer // Systems Architect
                    </p>
                    <p className="text-neutral-500 font-mono text-[11px] leading-relaxed max-w-2xl">
                      Specialized in deploying high-performance full-stack
                      environments. Merging pixel-perfect immersive front-end
                      frameworks with resilient, reactive back-end data
                      pipelines.
                    </p>
                  </div>
                </div>

                {/* SECTION 2: GRID CORE METRICS & DATA CORES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-[#0b0b0d] border border-neutral-900 rounded-xl p-4 space-y-1">
                    <span className="block text-neutral-600 font-mono text-[9px] font-bold tracking-wider uppercase">
                      VIRTUAL_BASE
                    </span>
                    <span className="text-neutral-200 font-mono text-xs font-semibold tracking-wide block">
                      Cairo, Egypt (GMT+3)
                    </span>
                  </div>
                  <div className="bg-[#0b0b0d] border border-neutral-900 rounded-xl p-4 space-y-1">
                    <span className="block text-neutral-600 font-mono text-[9px] font-bold tracking-wider uppercase">
                      EXPERIENCE_CYCLE
                    </span>
                    <span className="text-neutral-200 font-mono text-xs font-semibold tracking-wide block">
                      +2 Years Continuous Dev
                    </span>
                  </div>
                  <div className="bg-[#0b0b0d] border border-neutral-900 rounded-xl p-4 space-y-1 sm:col-span-2 md:col-span-1">
                    <span className="block text-neutral-600 font-mono text-[9px] font-bold tracking-wider uppercase">
                      ACADEMIC_TRACK
                    </span>
                    <span className="text-neutral-200 font-mono text-xs font-semibold tracking-wide block">
                      DECI Ministry Scholar
                    </span>
                  </div>
                </div>

                {/* SECTION 3: TECH MATRIX & ENGINE CAPSULES */}
                <div className="space-y-4">
                  <h3 className="text-neutral-400 font-mono text-[10px] font-bold tracking-widest border-l-2 border-blue-500 pl-3 uppercase">
                    ENGINEERING_STACK_MATRIX
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Front-End Node Group */}
                    <div className="bg-[#0a0a0c] border border-neutral-900/60 rounded-xl p-4 space-y-3">
                      <span className="block text-neutral-400 font-mono text-[10px] font-black tracking-widest text-blue-400">
                        // CLIENT_SIDE_ENGINES
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "React.js",
                          "Next.js (App Router)",
                          "TypeScript",
                          "Tailwind CSS",
                          "Framer Motion",
                          "Redux Toolkit",
                          "HTML5/CSS3",
                          "JavaScript ES6+",
                        ].map((tech) => (
                          <span
                            key={tech}
                            className="bg-neutral-900/40 border border-neutral-800/70 text-neutral-300 px-2.5 py-1 rounded-md font-mono text-[10px] tracking-wide"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Back-End & Cloud Data Node Group */}
                    <div className="bg-[#0a0a0c] border border-neutral-900/60 rounded-xl p-4 space-y-3">
                      <span className="block text-neutral-400 font-mono text-[10px] font-black tracking-widest text-amber-500">
                        // SERVER_SIDE_ARCHITECTURES
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Node.js",
                          "Express.js",
                          "Python (Core & Scripting)",
                          "Firebase Auth & Firestore",
                          "MongoDB / Mongoose",
                          "REST APIs Architectures",
                          "JSON / Ajax Streams",
                          "Git & Security Modules",
                        ].map((tech) => (
                          <span
                            key={tech}
                            className="bg-neutral-900/40 border border-neutral-800/70 text-neutral-300 px-2.5 py-1 rounded-md font-mono text-[10px] tracking-wide"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── FOOTER INTERFACE & PACKET DISPATCH ─── */}
              <div
                className="px-6 py-5 border-t border-neutral-900 bg-[#0a0a0c]/80 flex flex-col sm:flex-row items-center justify-between gap-4"
                style={{ transform: "translateZ(45px)" }}
              >
                <div className="flex items-center gap-4 text-neutral-500 font-mono text-[9px] tracking-widest">
                  <span>FORMAT: ADOBE_PDF_ENGINE</span>
                  <span className="text-neutral-800">|</span>
                  <span>DATA_SIZE: 1.2 MB</span>
                </div>
                <a
                  href="/cv.pdf"
                  download="Mohamed_Elattar_FullStack_CV.pdf"
                  className="w-full sm:w-auto text-center bg-white hover:bg-neutral-200 text-black font-mono text-[11px] font-black tracking-widest px-8 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.08)] hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  DOWNLOAD FULL CV_STREAM
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    
      {/* Main Contact Modal Control System */}
      <AnimatePresence>
        {isContactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-lg bg-black/70 overflow-y-auto [perspective:1200px]">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setIsContactOpen(false)}
            />

            <motion.div
              ref={modalRef}
              onMouseMove={(e) => handleModalMouseMove(e, modalRef)}
              onMouseLeave={() => {
                modalX.set(0);
                modalY.set(0);
              }}
              style={{
                rotateX: rotateXSpring,
                rotateY: rotateYSpring,
                transformStyle: "preserve-3d",
              }}
              initial={{ opacity: 0, scale: 0.94, y: 30, rotateX: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 30, filter: "blur(12px)" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative w-full max-w-2xl bg-[#030303]/95 border border-neutral-900 rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header Interface */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b border-neutral-900 bg-black/40"
                style={{ transform: "translateZ(30px)" }}
              >
                <div className="flex items-center gap-2 text-white font-mono text-[10px] tracking-[0.25em] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  DYNAMIC_BOOKING_CORE // ENCRYPTED
                </div>
                <button
                  onClick={() => setIsContactOpen(false)}
                  className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-900/60 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Integrated Core Dynamic Notification Console */}
              <AnimatePresence>
                {notification.type && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`px-6 py-3 border-b text-[10px] font-mono tracking-wider font-bold uppercase text-left ${
                      notification.type === "success"
                        ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-400"
                        : "bg-red-950/20 border-red-900/40 text-red-400"
                    }`}
                  >
                    ⚡ {notification.message}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Tabs System */}
              <div
                className="px-6 pt-4"
                style={{ transform: "translateZ(35px)" }}
              >
                <div className="flex bg-black border border-neutral-900 p-1 rounded-xl relative">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("call");
                      setNotification({ type: null, message: "" });
                    }}
                    className={`flex-1 py-2 text-[10px] font-mono font-bold tracking-widest rounded-lg transition-all z-10 cursor-pointer ${activeTab === "call" ? "text-blue-400" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    CALENDAR MATRIX
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("message");
                      setNotification({ type: null, message: "" });
                    }}
                    className={`flex-1 py-2 text-[10px] font-mono font-bold tracking-widest rounded-lg transition-all z-10 cursor-pointer ${activeTab === "message" ? "text-blue-400" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    DIRECT PACKET TRANSMIT
                  </button>
                  <motion.div
                    layoutId="activeContactTabBG"
                    className="absolute top-1 bottom-1 bg-[#090909] border border-neutral-800/80 rounded-lg z-0"
                    style={{
                      left: activeTab === "call" ? "4px" : "50%",
                      right: activeTab === "call" ? "50%" : "4px",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                </div>
              </div>

              {/* Form Workspace Stream */}
              <form
                id="matrix-contact-form"
                onSubmit={handleFormSubmit}
                className="flex-1 overflow-y-auto p-6 space-y-4 text-left custom-scrollbar"
                style={{ transform: "translateZ(20px)" }}
              >
                <AnimatePresence mode="wait">
                  {activeTab === "call" ? (
                    <motion.div
                      key="call-tab-content"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
                    >
                      {/* Grid Calendar Layout */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-white font-mono text-[9px] font-bold tracking-widest">
                          <span>
                            {monthNames[currentMonth]} {currentYear}
                          </span>
                          <span className="text-neutral-600">
                            // SYSTEM_SCHEDULER
                          </span>
                        </div>
                        <div className="grid grid-cols-7 text-center font-mono text-[8px] text-neutral-600 font-bold mb-0.5">
                          <span>S</span>
                          <span>M</span>
                          <span>T</span>
                          <span>W</span>
                          <span>T</span>
                          <span>F</span>
                          <span>S</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5 relative">
                          {loadingSlots && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-20 flex items-center justify-center pointer-events-none animate-pulse text-[8px] font-mono text-blue-500 tracking-widest">
                              // SYNCHRONIZING_SLOTS...
                            </div>
                          )}
                          {blankDays.map((b) => (
                            <div key={`b-${b}`} />
                          ))}
                          {calendarDays.map((day) => {
                            const isPast = day < currentDate;
                            const isSelected = selectedDate === day;
                            const isTotallyFull =
                              getAvailableSlotsForDate(day).length === 0 &&
                              !isPast;
                            return (
                              <button
                                key={`d-${day}`}
                                type="button"
                                disabled={isPast}
                                onClick={() => {
                                  setSelectedDate(day);
                                  setSelectedTime(null);
                                }}
                                className={`aspect-square flex flex-col items-center justify-center font-mono text-[10px] font-bold rounded-lg transition-all border relative cursor-pointer ${
                                  isPast
                                    ? "text-neutral-800 bg-transparent border-transparent cursor-not-allowed"
                                    : isTotallyFull
                                      ? "text-red-500 bg-red-950/10 border-red-900/30 hover:border-red-800"
                                      : isSelected
                                        ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.25)] scale-105"
                                        : "text-neutral-400 bg-black border-neutral-900 hover:border-neutral-800 hover:text-white"
                                }`}
                              >
                                <span>{day}</span>
                                {isTotallyFull && (
                                  <span className="absolute bottom-1 w-1 h-1 bg-red-500 rounded-full" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Hour Pick Layout */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="block font-mono text-[8px] text-neutral-500 font-bold uppercase tracking-widest">
                            // MATRIX_AVAILABILITY_UNITS
                          </span>
                          {availableSlotsForSelectedDate.length === 0 ? (
                            <div className="p-4 bg-red-950/10 border border-red-900/30 rounded-xl text-center">
                              <p className="font-mono text-[9px] text-red-400 font-bold uppercase tracking-widest">
                                ⚠️ QUEUE_CAPACITY_EXCEEDED
                              </p>
                              <span className="text-[8px] font-mono text-neutral-600 block mt-1">
                                This node timeline is full. Pick another date
                                structure.
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-0.5">
                              {availableSlotsForSelectedDate.map((slot) => {
                                const isTimeSelected = selectedTime === slot;
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => setSelectedTime(slot)}
                                    className={`py-2 text-[9px] font-mono font-bold rounded-lg transition-all border text-center cursor-pointer ${isTimeSelected ? "bg-neutral-900 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]" : "bg-black border-neutral-900 text-neutral-500 hover:border-neutral-800 hover:text-neutral-300"}`}
                                  >
                                    {slot}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Payload Core Identity Fields */}
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              required={activeTab === "call"}
                              type="text"
                              placeholder="Identity Name"
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  name: e.target.value,
                                })
                              }
                              className="w-full bg-black border border-neutral-900 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-800 transition-colors focus:ring-1 focus:ring-neutral-900"
                            />
                            <input
                              required={activeTab === "call"}
                              type="email"
                              placeholder="Signature Email"
                              value={formData.email}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  email: e.target.value,
                                })
                              }
                              className="w-full bg-black border border-neutral-900 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-800 transition-colors focus:ring-1 focus:ring-neutral-900"
                            />
                          </div>
                          <textarea
                            required={activeTab === "call"}
                            rows={2}
                            placeholder="Session Target Architecture Blueprint Payload..."
                            value={formData.reason}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                reason: e.target.value,
                              })
                            }
                            className="w-full bg-black border border-neutral-900 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-800 resize-none transition-colors focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="msg-tab-content"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          required={activeTab === "message"}
                          type="email"
                          placeholder="Secure Mail Relay"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full bg-black border border-neutral-900 rounded-lg px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-neutral-800 transition-colors focus:ring-1 focus:ring-neutral-900"
                        />
                        <input
                          type="tel"
                          placeholder="Cellular Endpoint Link (Optional)"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full bg-black border border-neutral-900 rounded-lg px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-neutral-800 transition-colors focus:ring-1 focus:ring-neutral-900"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-black border border-neutral-900 rounded-lg px-4 py-2.5">
                        <span className="font-mono text-[11px] text-neutral-400">
                          Establish Secure WhatsApp Node Routing
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.whatsapp}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                whatsapp: e.target.checked,
                              })
                            }
                          />
                          <div className="w-8 h-4 bg-neutral-900 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-600 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white border border-neutral-800" />
                        </label>
                      </div>
                      <div className="relative">
                        <textarea
                          required={activeTab === "message"}
                          rows={5}
                          placeholder="Compile message payloads stream lines into text environment..."
                          value={formData.message}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              message: e.target.value,
                            })
                          }
                          className="w-full bg-black border border-neutral-900 rounded-lg px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-neutral-800 resize-none transition-colors focus:ring-1 focus:ring-neutral-900"
                        />
                        <div className="absolute bottom-3 right-3 font-mono text-[8px] text-neutral-600 cursor-default select-none group-focus-within:text-neutral-400">
                          PAYLOAD_SIZE: {new Blob([formData.message]).size}{" "}
                          BYTES
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* Footer Control Deck */}
              <div
                className="px-6 py-4 border-t border-neutral-900 bg-black/40 flex items-center justify-end"
                style={{ transform: "translateZ(45px)" }}
              >
                <button
                  form="matrix-contact-form"
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (activeTab === "call" &&
                      (!selectedTime ||
                        availableSlotsForSelectedDate.length === 0))
                  }
                  className="bg-white hover:bg-neutral-200 text-black font-mono text-[10px] font-black tracking-widest px-6 py-3 rounded-xl transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 cursor-pointer uppercase"
                >
                  {isSubmitting
                    ? "TRANSMITTING_PACKETS..."
                    : activeTab === "call"
                      ? "[ DISPATCH_RESERVATION ]"
                      : "[ TRANSMIT_STREAM_PACKET ]"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
