import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Terminal, Cpu, ShieldAlert, Wifi } from 'lucide-react';

interface SplashLoaderProps {
  key?: string;
  onComplete: () => void;
}

export default function SplashLoader({ onComplete }: SplashLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const debugSteps = [
    { text: 'BOOTING INTEGRATED PACKZY DISPATCH VECTOR...', delay: 100 },
    { text: 'VERIFYING IFRAME REVERSE PROXY LAYER [PORT 3000]...', delay: 350 },
    { text: 'CONFIGURING CLIENT AUDIO SYNTHESIS ENGINE (FEEDBACK)...', delay: 700 },
    { text: 'CONNECTING HIGH-THROUGHPUT SYSTEM WEBCAM CORES...', delay: 1100 },
    { text: 'DECODER WEB ASSEMBLY BINARIES MOUNTED SUCCESSFULLY.', delay: 1400 },
    { text: 'ESTABLISHING PORTAL FORWARDING LINKS...', delay: 1750 },
    { text: 'SYSTEM SECURITY POLICY PROTOCOLS VERIFIED [PASS]...', delay: 2000 },
    { text: 'EMITTING SECURE SCAN SCANNER GRAPHICS MODULE...', delay: 2300 },
  ];

  // Progress logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const startProgress = () => {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          // Organic progression: rapid early on, slight holds, quick finish
          const remaining = 100 - prev;
          let increment = 1;
          if (remaining > 60) {
            increment = Math.floor(Math.random() * 12) + 5; // fast start
          } else if (remaining > 20) {
            increment = Math.floor(Math.random() * 6) + 2;  // slower mid-stage
          } else {
            increment = Math.floor(Math.random() * 3) + 1;  // steady end
          }
          const next = Math.min(100, prev + increment);
          return next;
        });
      }, 75);
    };

    startProgress();
    return () => clearInterval(timer);
  }, []);

  // Micro-terminal log lines simulation
  useEffect(() => {
    if (currentStep < debugSteps.length) {
      const activeStep = debugSteps[currentStep];
      const stepTimer = setTimeout(() => {
        setLogs((prev) => [...prev, `[OK] ${activeStep.text}`].slice(-4));
        setCurrentStep((prev) => prev + 1);
      }, activeStep.delay);

      return () => clearTimeout(stepTimer);
    }
  }, [currentStep]);

  // Complete event wrapper
  useEffect(() => {
    if (progress === 100) {
      const delayComplete = setTimeout(() => {
        onComplete();
      }, 600); // Exquisite pause for maximum feedback satisfaction
      return () => clearTimeout(delayComplete);
    }
  }, [progress, onComplete]);

  return (
    <motion.div
      id="packzy-immersive-loader-overlay"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.08,
        filter: 'blur(10px)',
        transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } 
      }}
      className="fixed inset-0 w-screen h-screen bg-black z-50 flex flex-col justify-between items-center p-6 md:p-12 overflow-hidden select-none font-sans"
    >
      {/* Background Ambience: Moving laser scanners & grid overlays */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle matrix-like grid structure */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `linear-gradient(#00FF9C 1px, transparent 1px), linear-gradient(90deg, #00FF9C 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Ambient top-down glowing radial circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#00FF9C]/5 rounded-full blur-[140px]" />

        {/* Dynamic sweeping laser scanner overlay */}
        <motion.div 
          initial={{ y: '-10%' }}
          animate={{ y: '110%' }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00FF9C]/25 to-transparent blur-[2px]"
        />
        <motion.div 
          initial={{ y: '-10%' }}
          animate={{ y: '110%' }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent shadow-[0_0_8px_#00FF9C]"
        />

        {/* Scanlines Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] opacity-25" />
      </div>

      {/* Header telemetry info */}
      <div className="w-full flex justify-between items-center z-10 font-mono text-[9px] text-white/40 tracking-wider">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-ping" />
          <span className="text-white/60 uppercase">NODE: LIVE_DECODER_M2</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-[#00FF9C]/60" /> SECURE_SSL
          </span>
          <span>v2.4.9/AISTUDIO</span>
        </div>
      </div>

      {/* Centerpiece: Spinning Cyber Target & Core Matrix Percentage */}
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-8 z-10">
        
        {/* Core animated portal loader bracket */}
        <div className="relative flex items-center justify-center">
          
          {/* Animated pulsing outer hexagonal target ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            className="w-36 h-36 md:w-44 md:h-44 rounded-full border-2 border-dashed border-[#00FF9C]/10 flex items-center justify-center p-8"
          />

          {/* Opposite spinning step-bracket ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
            className="absolute w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-dotted border-emerald-500/30 flex items-center justify-center"
          />

          {/* Quick-pulsing target corners (Simulates QR bracket zone locator bounds) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 md:w-48 md:h-48 relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00FF9C]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00FF9C]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00FF9C]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00FF9C]" />
            </div>
          </div>

          {/* Core Numerical Progress with deep gradient text */}
          <div className="absolute flex flex-col items-center justify-center">
            <motion.div 
              key={progress}
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl md:text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-[#00FF9C] tracking-tighter"
            >
              {progress}%
            </motion.div>
            <span className="text-[9px] font-mono font-bold tracking-widest text-[#00FF9C]/50 uppercase mt-1">
              {progress < 100 ? 'Resolving Vector' : 'Synchronized'}
            </span>
          </div>

        </div>

        {/* Interactive progress loading bar */}
        <div className="w-full max-w-sm flex flex-col gap-2 items-center px-4">
          <div className="h-[2px] w-full bg-neutral-900 border border-white/5 rounded-full overflow-hidden p-[1px]">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-500 via-[#00FF9C] to-emerald-400 rounded-full"
              style={{ width: `${progress}%` }}
              layoutId="splash-progress-inner-bar"
            />
          </div>
          <div className="w-full flex items-center justify-between text-[8px] font-mono text-white/30 px-0.5">
            <span>PACKZY DISPATCH</span>
            <span className="animate-pulse text-[#00FF9C]">{progress < 100 ? 'ONLINE DECODING' : 'INIT READY'}</span>
          </div>
        </div>

      </div>

      {/* Micro Diagnostic Shell View (Fascinating text outputs to capture attention) */}
      <div className="w-full max-w-md bg-neutral-950/60 border border-white/5 rounded-xl p-4 min-h-[96px] z-10 backdrop-blur-sm shadow-2xl flex flex-col gap-1">
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5 mb-1 text-[8px] font-mono text-white/60 tracking-wider">
          <Terminal className="w-3 h-3 text-[#00FF9C]" />
          <span>MICROKOSM SHELL LOGS</span>
        </div>
        <div className="flex flex-col gap-1">
          {logs.length === 0 ? (
            <span className="text-[10px] font-mono text-white/20">Awaiting kernel bootstrap...</span>
          ) : (
            logs.map((log, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-mono text-[#00FF9C]/80 flex items-center gap-1.5 leading-snug"
              >
                <div className="text-white/20 select-none">{`>`}</div>
                <div className="truncate">{log}</div>
              </motion.div>
            ))
          )}
        </div>
      </div>

    </motion.div>
  );
}
