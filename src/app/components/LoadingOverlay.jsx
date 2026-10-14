import { motion } from 'framer-motion';

const LoadingOverlay = ({ text = "PROJECTS.EXE", subtext = "// SELECTING_NODES" }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
    >
      {/* الـ Subtext الصغير اللي فوق الكلمة */}
      <span className="text-[10px] md:text-xs font-mono text-blue-500 tracking-[0.3em] uppercase mb-2 animate-pulse">
        {subtext}
      </span>
      
      {/* الكلمة الكبيرة الأساسية */}
      <h1 className="text-4xl md:text-7xl font-black text-white tracking-wider font-sans select-none">
        {text}
      </h1>
    </motion.div>
  );
};

export default LoadingOverlay;