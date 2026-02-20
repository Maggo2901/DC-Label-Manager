import { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

// CONFIGURATION
const TOTAL_DURATION_MS = 4500; // Increased to 4.5s for readability

const loadingMessages = [
  "Initializing Print Engine...",
  "Loading Label Modules...",
  "Connecting Output Interface...",
  "Verifying PDF Renderer...",
  "System Ready."
];

const SplashScreen = ({ onFinish }) => {
  const [phase, setPhase] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  
  // 0: Init (Black)
  // 1: Background & Deep Ambience
  // 2: Logo & Main Scan
  // 3: Text Reveal
  // 4: System Init Text

  useEffect(() => {
    const timeline = [
      { t: 50, p: 1 },   // Start Background immediately
      { t: 800, p: 2 },  // Logo / Scan starts
      { t: 1400, p: 3 }, // Text Enters
      { t: 2000, p: 4 }, // System Text Starts
      { t: TOTAL_DURATION_MS, action: onFinish }
    ];

    const timers = timeline.map(event => 
      setTimeout(() => event.action ? event.action() : setPhase(event.p), event.t)
    );

    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  // Message Cycling Effect
  useEffect(() => {
    if (phase < 4) return;

    const interval = setInterval(() => {
        setMsgIndex(prev => {
            if (prev < loadingMessages.length - 1) return prev + 1;
            return prev;
        });
    }, 500); // 500ms per message

    return () => clearInterval(interval);
  }, [phase]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden select-none cursor-wait"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 1, ease: "easeInOut" } }}
      >
        {/* --- LAYER 1: DEEP ATMOSPHERE --- */}
        <motion.div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear_gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

          {/* Subtle Central Bloom */}
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vh] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" 
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Slow Light Shift */}
          <motion.div 
            className="absolute inset-0 opacity-30 pointer-events-none mix-blend-screen"
            style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.03), transparent 60%)'
            }}
            animate={{ 
                backgroundPosition: ['0% 0%', '100% 100%'],
                scale: [1, 1.1, 1]
            }}
            transition={{ duration: 15, ease: "linear", repeat: Infinity }}
          />
        </motion.div>

        {/* --- LAYER 2: LOGO & CONTENT --- */}
        <div className="relative z-10 flex flex-col items-center justify-center">
            
            {/* LOGO CONTAINER */}
            <div className="relative w-32 h-32 mb-8">
                <motion.div
                    className="w-full h-full relative drop-shadow-2xl"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={phase >= 2 ? { 
                        opacity: 1, 
                        scale: 1, 
                        y: 0,
                    } : {}}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    {/* Breathing Animation Wrapper */}
                    <motion.div
                        className="w-full h-full"
                        animate={phase >= 4 ? { scale: [1, 1.02, 1] } : {}}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                       <svg viewBox="0 0 100 100" className="w-full h-full">
                          <defs>
                            <linearGradient id="bgBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#38bdf8" />
                              <stop offset="100%" stopColor="#1e3a8a" />
                            </linearGradient>
                            <linearGradient id="printerGrey" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#f8fafc" />
                              <stop offset="100%" stopColor="#cbd5e1" />
                            </linearGradient>
                            <linearGradient id="pdfRed" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#ef4444" />
                              <stop offset="100%" stopColor="#991b1b" />
                            </linearGradient>
                            <linearGradient id="dataYellow" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#facc15" />
                              <stop offset="100%" stopColor="#ea580c" />
                            </linearGradient>
                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="2" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>

                          {/* 1. Background Container */}
                          <rect x="5" y="10" width="90" height="85" rx="15" fill="url(#bgBlue)" stroke="#1e40af" strokeWidth="1" />
                          
                          {/* 2. Printer Structure */}
                          <path d="M15,65 L85,65 L85,82 Q85,88 79,88 L21,88 Q15,88 15,82 Z" fill="url(#printerGrey)" filter="url(#shadow)" />
                          <rect x="20" y="55" width="60" height="15" rx="2" fill="#334155" opacity="0.8" />
                          
                          {/* 3. Paper Label & Barcode */}
                          <rect x="25" y="45" width="50" height="35" rx="1" fill="white" />
                          {/* Barcode */}
                          <g fill="#1e293b">
                            <rect x="28" y="60" width="2" height="12" />
                            <rect x="31" y="60" width="1" height="12" />
                            <rect x="33" y="60" width="3" height="12" />
                            <rect x="38" y="60" width="1" height="12" />
                            <rect x="40" y="60" width="4" height="12" />
                            <rect x="46" y="60" width="2" height="12" />
                            <rect x="49" y="60" width="1" height="12" />
                            <rect x="51" y="60" width="3" height="12" />
                            <rect x="56" y="60" width="2" height="12" />
                            <rect x="60" y="60" width="1" height="12" />
                            <rect x="63" y="60" width="3" height="12" />
                            <rect x="68" y="60" width="2" height="12" />
                          </g>
                          {/* Yellow Data Fields */}
                          <rect x="28" y="48" width="12" height="8" rx="1" fill="url(#dataYellow)" stroke="#b45309" strokeWidth="0.5" />
                          <rect x="42" y="48" width="12" height="8" rx="1" fill="url(#dataYellow)" stroke="#b45309" strokeWidth="0.5" />

                          {/* 4. Printer Details */}
                          <rect x="20" y="75" width="40" height="4" rx="2" fill="#94a3b8" />
                          <circle cx="78" cy="77" r="3" fill="#3b82f6" />

                          {/* 5. PDF Badge */}
                          <motion.g 
                            transform="translate(60, 5) rotate(5)"
                            initial={{ scale: 0 }}
                            animate={phase >= 2 ? { scale: 1 } : {}}
                            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                          >
                            <path d="M0,0 L20,0 L30,10 L30,35 L0,35 Z" fill="url(#pdfRed)" stroke="white" strokeWidth="1.5" filter="url(#shadow)" />
                            <path d="M20,0 L20,10 L30,10 Z" fill="#fca5a5" opacity="0.8" />
                            <text x="15" y="26" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="11" fill="white" textAnchor="middle">PDF</text>
                            <path d="M15,8 L16,6 L17,8 L19,9 L17,10 L16,12 L15,10 L13,9 Z" fill="white" />
                          </motion.g>
                        </svg>
                    </motion.div>
                </motion.div>
            </div>

            {/* TYPOGRAPHY */}
            <div className="flex flex-col items-center text-center space-y-4">
                {/* Main Title Row */}
                <div className="flex items-baseline gap-3 overflow-hidden">
                    <motion.h1 
                        className="text-5xl font-bold tracking-tight text-white drop-shadow-lg"
                        initial={{ y: 20, opacity: 0 }}
                        animate={phase >= 3 ? { y: 0, opacity: 1 } : {}}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        DC Label
                    </motion.h1>
                    
                    <motion.span 
                        className="text-5xl font-light text-slate-400 tracking-tight"
                        initial={{ x: -10, opacity: 0 }}
                        animate={phase >= 3 ? { x: 0, opacity: 1 } : {}}
                        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                    >
                        Platform
                    </motion.span>
                </div>

                {/* Subtitle */}
                <motion.div
                    className="overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={phase >= 3 ? { opacity: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <motion.p 
                        className="text-sm font-medium tracking-[0.35em] text-cyan-500/80 uppercase"
                        initial={{ y: 10 }}
                        animate={phase >= 3 ? { 
                            y: 0,
                            opacity: [0.8, 1, 0.8]
                        } : {}}
                        transition={{ 
                            y: { duration: 0.8, delay: 0.3, ease: "easeOut" },
                            opacity: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }
                         }}
                    >
                        Enterprise Print & Label System
                    </motion.p>
                </motion.div>
            </div>

            {/* SYSTEM INITIALIZATION TEXT */}
            <motion.div
                className="mt-12 h-8"
                initial={{ opacity: 0 }}
                animate={phase >= 4 ? { opacity: 1 } : {}}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
                    {/* Activity Dot */}
                    <motion.div 
                        className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                    />
                    
                    {/* Text */}
                    <span className="font-mono text-xs sm:text-sm text-cyan-400 tracking-wide min-w-[200px] text-left">
                        <span className="opacity-80">&gt; </span>
                        {loadingMessages[msgIndex]}
                        <motion.span 
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block w-2 h-4 ml-1 bg-cyan-500/50 align-middle"
                        />
                    </span>
                </div>
            </motion.div>

        </div>

    </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
