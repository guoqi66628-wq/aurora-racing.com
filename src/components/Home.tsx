import { motion } from "motion/react";
import { Instagram, ShoppingCart } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getAssetUrl } from "../utils/cdn";

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Target date: Nov 15th, 2026, 00:00:00 Beijing time
    const targetDate = new Date("2026-11-15T00:00:00+08:00");

    const interval = setInterval(() => {
      const currentTime = new Date();
      const difference = targetDate.getTime() - currentTime.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const [showStoreQR, setShowStoreQR] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDoc(e: MouseEvent) {
      if (!qrRef.current) return;
      if (showStoreQR && !qrRef.current.contains(e.target as Node)) {
        setShowStoreQR(false);
      }
    }
    document.addEventListener("click", handleDoc);
    return () => document.removeEventListener("click", handleDoc);
  }, [showStoreQR]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <section
      id="home"
      className="relative w-full min-h-screen flex md:items-center items-start pt-20 md:pt-24 pb-24 md:py-24 overflow-hidden bg-aurora-black"
    >
      {/* Background Image with Lightened Overlay */}
      <div className="absolute inset-0 z-0">
        {/* Desktop Image */}
        <img
          src={getAssetUrl("/images/hero/hero-desktop.webp")}
          alt="AURORA Racing Car"
          width="1920"
          height="1080"
          fetchPriority="high"
          decoding="async"
          className="hidden md:block w-full h-full object-cover opacity-100 md:scale-125 lg:scale-100 md:origin-[85%_70%] lg:origin-center"
          referrerPolicy="no-referrer"
        />
        {/* Mobile Image */}
        <img
          src={getAssetUrl("/images/hero/hero-mobile.webp")}
          alt="AURORA Racing Car (Mobile)"
          width="1080"
          height="1920"
          fetchPriority="high"
          decoding="async"
          className="block md:hidden w-full h-full object-cover object-center opacity-100"
          referrerPolicy="no-referrer"
        />

        {/* Dynamic Speed and Engine Animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Engine/Headlight Pulsing Glow */}
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-[40%] right-[30%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-[#a5d6a7]/10 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen"
          />
          <motion.div
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scale: [0.9, 1.2, 0.9],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute top-[45%] right-[20%] w-[200px] h-[200px] md:w-[400px] md:h-[400px] bg-aurora-purple/20 rounded-full blur-[60px] md:blur-[100px] mix-blend-screen"
          />

          {/* Speed Streaks (Moving lines to convey motion) */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`streak-${i}`}
              initial={{ x: "100vw", opacity: 0 }}
              animate={{ x: "-100vw", opacity: [0, 1, 0] }}
              transition={{
                duration: 1.5 + (i % 3) * 0.5,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.4,
              }}
              className="absolute h-[1px] md:h-[2px] bg-gradient-to-r from-transparent via-[#a5d6a7] to-transparent w-64 md:w-96 mix-blend-screen"
              style={{
                top: `${20 + i * 12}%`,
                filter: "drop-shadow(0 0 8px rgba(165,214,167,0.8))",
              }}
            />
          ))}

          {/* Abstract Spinning Element (HUD like, simulating wheel/engine tech) */}
          <div className="absolute top-[55%] right-[25%] -translate-y-1/2 -translate-x-1/2 opacity-20 md:opacity-30 mix-blend-screen">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="w-48 h-48 md:w-80 md:h-80 border-[1px] border-[#a5d6a7]/40 rounded-full border-dashed"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-56 md:h-56 border-[2px] border-white/20 rounded-full border-dotted"
            />
            <motion.div
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-24 md:h-24 border-[1px] border-[#a5d6a7]/60 rounded-full"
              style={{ boxShadow: "0 0 20px rgba(165,214,167,0.4) inset" }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1800px] mx-auto px-4 md:px-8 lg:px-10 xl:px-12 flex flex-col items-start mt-2 md:mt-8">
        {/* Mobile: School Name (Above title) */}
        <motion.p
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.05 }}
          className="md:hidden text-[13px] text-[#4a4a4a] tracking-[0.15em] font-sans font-medium uppercase mb-2 italic px-1"
        >
          Shenzhen Technology University
        </motion.p>

        <motion.h1
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-[100px] leading-[0.9] font-black uppercase mb-3 md:mb-4 flex flex-col italic md:px-0 px-1"
        >
          {/* Desktop Title Structure */}
          <div className="hidden md:flex items-end gap-6 text-[100%]">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1E096A] via-[#3C1088] to-[#6722C1]">
              AURORA
            </span>
            <span className="flex gap-3 mb-8">
              <span className="w-16 h-4 bg-[#1E096A] skew-x-[-20deg]"></span>
              <span className="w-5 h-4 bg-[#6722C1] skew-x-[-20deg]"></span>
              <span className="w-5 h-4 bg-[#177A45] skew-x-[-20deg]"></span>
              <span className="w-10 h-4 bg-[#2CF06D] skew-x-[-20deg]"></span>
            </span>
          </div>
          <span className="hidden md:block text-[#151515]">RACING</span>

          {/* Mobile Title Structure */}
          <div className="md:hidden flex flex-col gap-0 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1E096A] via-[#3C1088] to-[#6722C1] text-[64px] leading-[0.95]">
              AURORA
            </span>
            <span className="text-[#151515] text-[64px] leading-[0.9] -mt-1">
              RACING
            </span>
            <span className="flex gap-2 mt-3 mb-2">
              <span className="w-10 h-2 bg-[#1E096A] skew-x-[-20deg]"></span>
              <span className="w-4 h-2 bg-[#6722C1] skew-x-[-20deg]"></span>
              <span className="w-4 h-2 bg-[#177A45] skew-x-[-20deg]"></span>
              <span className="w-8 h-2 bg-[#2CF06D] skew-x-[-20deg]"></span>
            </span>
          </div>
        </motion.h1>

        {/* Desktop: Subtitles */}
        <motion.p
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="hidden md:block text-xl font-medium text-gray-700 tracking-[0.15em] uppercase max-w-lg mb-8 italic leading-tight"
        >
          Pushing the limits of electric performance
          <br />
          <span className="text-sm text-gray-500 mt-2 block tracking-widest font-sans font-bold">
            From Shenzhen Technology University
          </span>
        </motion.p>

        {/* Mobile: Subtitles */}
        <motion.p
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="md:hidden text-[10px] font-medium text-[#4a4a4a] tracking-[0.08em] uppercase mb-4 italic leading-snug whitespace-nowrap px-1"
        >
          Pushing the limits of electric performance
        </motion.p>

        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          className="relative -mt-0.5"
        >
          <div className="relative z-10 w-fit -ml-8 -mt-2 hidden md:block">
            {/* Cyberpunk Style Countdown Panels */}
            <div className="flex flex-col gap-2 origin-left scale-[0.6] lg:scale-[0.65] xl:scale-[0.7] 2xl:scale-[0.75]">
              
              {/* Top Banner (Dark) */}
              <div className="relative flex h-14 md:h-[60px] w-fit">
                {/* Background Shadow */}
                <div className="absolute inset-0 bg-green-400/10 blur-[20px] rounded-full"></div>
                
                {/* Skewed Container */}
                <div className="relative flex bg-[#111116] skew-x-[-20deg] border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                  
                  {/* Left Red & Purple Accents */}
                  <div className="absolute left-[-2px] inset-y-0 w-[4px] bg-[#2CF06D] shadow-[0_0_12px_#2CF06D]"></div>
                  <div className="absolute left-[-2px] bottom-[-2px] w-8 h-[3px] bg-[#2CF06D] shadow-[0_0_8px_#2CF06D]"></div>
                  <div className="absolute left-6 bottom-[-2px] w-1/3 h-[2px] bg-[#9922EE] shadow-[0_0_10px_#9922EE]"></div>
                  
                  {/* Left Top subtle accent */}
                  <div className="absolute top-2 left-6 flex gap-1 opacity-80 skew-x-[20deg]">
                    <div className="w-2 h-[2px] bg-[#2CF06D] skew-x-[-20deg]"></div>
                    <div className="w-2 h-[2px] bg-[#2CF06D] skew-x-[-20deg]"></div>
                  </div>

                  {/* Left Content */}
                  <div className="px-5 md:px-8 flex items-center justify-center relative">
                    <div className="skew-x-[20deg] flex items-center gap-3">
                      <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border-[2px] border-[#2CF06D] bg-transparent flex items-center justify-center relative shadow-[0_0_8px_#2CF06D]">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#2CF06D]"></div>
                      </div>
                      <span className="text-gray-100 font-display font-medium tracking-[0.2em] text-[10px] md:text-[13px] uppercase italic drop-shadow-md">
                        NEXT RACE START IN
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-[2px] bg-gradient-to-t from-[#9922EE] to-transparent bg-[#9922EE] shadow-[0_0_10px_#9922EE] h-[130%] -my-1 origin-bottom rotate-[20deg]"></div>

                  {/* Right Content */}
                  <div className="px-6 md:px-12 pr-12 md:pr-16 flex items-center justify-center relative">
                    {/* Top right red accent line & tick marks */}
                    <div className="absolute top-[-2px] right-0 w-2/3 h-[3px] bg-[#2CF06D] shadow-[0_0_10px_#2CF06D]"></div>
                    <div className="absolute top-[-2px] right-[-2px] w-[3px] h-6 bg-[#2CF06D] shadow-[0_0_10px_#2CF06D]"></div>
                    <div className="absolute top-[8px] right-5 flex gap-1 skew-x-[20deg]">
                      <div className="w-1.5 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px]"></div>
                      <div className="w-1.5 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px]"></div>
                      <div className="w-1.5 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px]"></div>
                    </div>
                    {/* Bottom right purple edge */}
                    <div className="absolute bottom-[-2px] right-4 w-1/3 h-[2px] bg-[#9922EE] shadow-[0_0_10px_#9922EE]"></div>

                    <div className="skew-x-[20deg] flex flex-col items-start pt-1 ml-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-display font-black tracking-widest text-lg md:text-[22px] italic leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]">
                          合肥
                        </span>
                        <span className="text-base md:text-lg" role="img" aria-label="China Flag">🇨🇳</span>
                      </div>
                      <span className="text-[#2CF06D] font-sans font-bold tracking-[0.25em] text-[10px] md:text-sm uppercase italic drop-shadow-[0_0_5px_rgba(44,240,109,0.6)] mt-0.5">
                        FSC
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Banner (Light) */}
              <div className="relative mt-2 drop-shadow-[0_15px_25px_rgba(0,0,0,0.2)] h-[90px] md:h-[110px] flex w-fit">
                <div className="absolute inset-0 bg-white/20 blur-[30px]"></div>
                
                <div className="relative flex bg-[#f5f6f8] skew-x-[-20deg] border border-gray-200">
                  
                  {/* Top left red corner block */}
                  <div className="absolute top-[-2px] left-8 w-16 h-[3px] bg-[#2CF06D] shadow-[0_0_10px_#2CF06D]"></div>
                  <div className="absolute top-[-2px] left-[-2px] w-[3px] h-12 bg-[#2CF06D] shadow-[0_0_10px_#2CF06D]"></div>
                  
                  {/* Left bottom purple edge */}
                  <div className="absolute left-[-2px] bottom-2 w-[2px] h-1/2 bg-[#9922EE] shadow-[0_0_8px_#9922EE]"></div>

                  {/* Decorative faint slots/lines top */}
                  <div className="absolute top-2 left-6 flex gap-1 skew-x-[20deg] opacity-70">
                      <div className="w-2 h-1 bg-[#2CF06D] skew-x-[-20deg]"></div>
                      <div className="w-2 h-1 bg-[#2CF06D] skew-x-[-20deg]"></div>
                      <div className="w-2 h-1 bg-[#2CF06D] skew-x-[-20deg]"></div>
                  </div>

                  {/* Decorative faint lines middle top/bottom */}
                  <div className="absolute top-[8px] right-[40%] flex gap-[3px] opacity-20 skew-x-[20deg]">
                      <div className="w-1 h-0.5 bg-black skew-x-[-20deg]"></div>
                      <div className="w-3 h-0.5 bg-black skew-x-[-20deg]"></div>
                      <div className="w-1 h-0.5 bg-black skew-x-[-20deg]"></div>
                  </div>
                  <div className="absolute bottom-[8px] left-[30%] flex gap-[3px] opacity-20 skew-x-[20deg]">
                      <div className="w-3 h-0.5 bg-black skew-x-[-20deg]"></div>
                      <div className="w-1 h-0.5 bg-black skew-x-[-20deg]"></div>
                      <div className="w-1 h-0.5 bg-black skew-x-[-20deg]"></div>
                  </div>
                  
                  {/* Bottom right red corner block */}
                  <div className="absolute bottom-[-2px] right-2 w-32 h-[3px] bg-[#2CF06D] shadow-[0_0_12px_rgba(44,240,109,0.8)]"></div>
                  <div className="absolute bottom-[-2px] right-[-2px] w-[3px] h-10 bg-[#2CF06D] shadow-[0_0_12px_rgba(44,240,109,0.8)]"></div>
                  <div className="absolute top-[10px] right-10 flex gap-1 skew-x-[20deg] opacity-80">
                      <div className="w-2 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px]"></div>
                      <div className="w-2 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px]"></div>
                      <div className="w-2 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px]"></div>
                  </div>

                  {/* Content (Timers) */}
                  <div className="skew-x-[20deg] flex items-center justify-center px-10 md:px-14">
                    <div className="flex items-center justify-center gap-6 md:gap-10 font-display">
                      
                      {/* Days */}
                      <div className="flex flex-col items-center w-[50px] md:w-[70px]">
                        <span className="text-[38px] md:text-[58px] font-black leading-none text-[#151522] italic -tracking-wider drop-shadow-sm">
                          {formatNumber(timeLeft.days)}
                        </span>
                        <span className="text-[9px] md:text-[11px] font-bold text-gray-500 mt-2 uppercase tracking-[0.2em] font-sans">
                          DD
                        </span>
                      </div>

                      {/* Colon Divider 1 */}
                      <div className="flex flex-col gap-2 items-center justify-center -mt-6">
                        <div className="w-1.5 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px] shadow-[0_0_5px_rgba(44,240,109,0.4)]"></div>
                        <div className="w-1.5 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px] shadow-[0_0_5px_rgba(44,240,109,0.4)]"></div>
                      </div>

                      {/* Hours */}
                      <div className="flex flex-col items-center w-[50px] md:w-[70px]">
                        <span className="text-[38px] md:text-[58px] font-black leading-none text-[#151522] italic -tracking-wider drop-shadow-sm">
                          {formatNumber(timeLeft.hours)}
                        </span>
                        <span className="text-[9px] md:text-[11px] font-bold text-gray-500 mt-2 uppercase tracking-[0.2em] font-sans">
                          HH
                        </span>
                      </div>

                      {/* Colon Divider 2 */}
                      <div className="flex flex-col gap-2 items-center justify-center -mt-6">
                        <div className="w-1.5 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px] shadow-[0_0_5px_rgba(44,240,109,0.4)]"></div>
                        <div className="w-1.5 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px] shadow-[0_0_5px_rgba(44,240,109,0.4)]"></div>
                      </div>

                      {/* Minutes */}
                      <div className="flex flex-col items-center w-[50px] md:w-[70px]">
                        <span className="text-[38px] md:text-[58px] font-black leading-none text-[#151522] italic -tracking-wider drop-shadow-sm">
                          {formatNumber(timeLeft.minutes)}
                        </span>
                        <span className="text-[9px] md:text-[11px] font-bold text-gray-500 mt-2 uppercase tracking-[0.2em] font-sans">
                          MM
                        </span>
                      </div>

                      {/* Colon Divider 3 */}
                      <div className="flex flex-col gap-2 items-center justify-center -mt-6">
                        <div className="w-1.5 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px] shadow-[0_0_5px_rgba(44,240,109,0.4)]"></div>
                        <div className="w-1.5 h-1.5 bg-[#2CF06D] skew-x-[-20deg] rounded-[1px] shadow-[0_0_5px_rgba(44,240,109,0.4)]"></div>
                      </div>

                      {/* Seconds */}
                      <div className="flex flex-col items-center w-[50px] md:w-[70px]">
                        <span className="text-[38px] md:text-[58px] font-black leading-none text-[#151522] italic -tracking-wider drop-shadow-sm">
                          {formatNumber(timeLeft.seconds)}
                        </span>
                        <span className="text-[9px] md:text-[11px] font-bold text-gray-500 mt-2 uppercase tracking-[0.2em] font-sans">
                          SS
                        </span>
                      </div>
                      
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fallback for Mobile context (Keep a smaller version for phone screens) */}
          <div className="md:hidden relative z-10 w-fit -mt-2 cd-mob origin-top-left">
            <div className="bg-white/95 backdrop-blur-xl text-aurora-black px-4 py-3 shadow-[0_10px_30px_rgba(30,9,106,0.15)] rounded-xl border-t border-r border-b border-white/40 overflow-hidden relative skew-x-[-10deg] max-w-fit mt-2">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#2CF06D] to-[#9922EE]"></div>

              <div className="flex items-center gap-2 mb-2 mt-0.5 px-1 skew-x-[10deg]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#9922EE]"></span>
                </span>
                <span className="text-[10px] font-display font-bold tracking-widest text-[#9922EE] uppercase italic">合肥 🇨🇳 FSC</span>
              </div>

              <div className="flex items-center gap-3 font-display skew-x-[10deg] px-1">
                {/* Days */}
                <div className="flex flex-col items-center min-w-[32px]">
                  <span className="text-2xl font-black leading-none text-[#151522] italic -tracking-wide">
                    {formatNumber(timeLeft.days)}
                  </span>
                  <span className="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-widest font-sans">DD</span>
                </div>

                <div className="flex flex-col gap-1 items-center justify-center -mt-2">
                  <div className="w-1 h-1 bg-[#9922EE] skew-x-[-10deg]"></div>
                  <div className="w-1 h-1 bg-[#9922EE] skew-x-[-10deg]"></div>
                </div>

                {/* Hours */}
                <div className="flex flex-col items-center min-w-[32px]">
                  <span className="text-2xl font-black leading-none text-[#151522] italic -tracking-wide">
                    {formatNumber(timeLeft.hours)}
                  </span>
                  <span className="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-widest font-sans">HH</span>
                </div>

                <div className="flex flex-col gap-1 items-center justify-center -mt-2">
                  <div className="w-1 h-1 bg-[#9922EE] skew-x-[-10deg]"></div>
                  <div className="w-1 h-1 bg-[#9922EE] skew-x-[-10deg]"></div>
                </div>

                {/* Minutes */}
                <div className="flex flex-col items-center min-w-[32px]">
                  <span className="text-2xl font-black leading-none text-[#151522] italic -tracking-wide">
                    {formatNumber(timeLeft.minutes)}
                  </span>
                  <span className="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-widest font-sans">MM</span>
                </div>

                <div className="flex flex-col gap-1 items-center justify-center -mt-2">
                  <div className="w-1 h-1 bg-[#9922EE] skew-x-[-10deg]"></div>
                  <div className="w-1 h-1 bg-[#9922EE] skew-x-[-10deg]"></div>
                </div>

                {/* Seconds */}
                <div className="flex flex-col items-center min-w-[32px]">
                  <span className="text-2xl font-black leading-none text-[#151522] italic -tracking-wide">
                    {formatNumber(timeLeft.seconds)}
                  </span>
                  <span className="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-widest font-sans">SS</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Info Bar & Social Media Links */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="absolute bottom-0 left-0 w-full px-6 md:px-12 lg:px-24 pb-6 md:pb-8 flex items-end justify-end z-30 pointer-events-none"
      >
        {/* Social Links */}
        <div className="hidden md:flex items-center gap-3 md:gap-4 ml-4 pointer-events-auto">
          <a
            href="https://www.instagram.com/_auroraracing?igsh=YW5pNW9ham85bDho&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Aurora Racing on Instagram"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f1f2e]/80 backdrop-blur-md flex items-center justify-center text-aurora-white hover:bg-[#7928ca] hover:scale-110 transition-all duration-100 shadow-lg border border-white/5"
          >
            <Instagram size={18} className="md:w-5 md:h-5" />
          </a>
          <a
            href="https://v.douyin.com/oEkcT_36nZI/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Aurora Racing on Douyin"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f1f2e]/80 backdrop-blur-md flex items-center justify-center text-aurora-white hover:bg-[#7928ca] hover:scale-110 transition-all duration-100 shadow-lg border border-white/5"
          >
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
              className="md:w-5 md:h-5"
            >
              <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
            </svg>
          </a>
          <a 
            href="https://mp.weixin.qq.com/s/1R4bB9u1_6IFkO6a6LQT0w"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Read Aurora Racing on WeChat"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f1f2e]/80 backdrop-blur-md flex items-center justify-center text-aurora-white hover:bg-[#7928ca] hover:scale-110 transition-all duration-100 shadow-lg border border-white/5 outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 1024 1024"
              fill="currentColor"
              className="md:w-[22px] md:h-[22px]"
            >
              <path d="M690.1 377.4c5.9 0 11.8.2 17.6.5-24.4-128.7-158.3-227.1-319.9-227.1C209 150.8 64 271.4 64 420.2c0 81.1 43.6 154.2 111.9 203.6a21.5 21.5 0 0 1 9.1 17.6c0 2.4-.5 4.6-1.1 6.9-5.5 20.3-14.2 52.8-14.6 54.3-.7 2.6-1.7 5.2-1.7 7.9 0 5.9 4.8 10.8 10.8 10.8 2.3 0 4.2-.9 6.2-2l70.9-40.9c5.3-3.1 11-5 17.2-5 3.2 0 6.4.5 9.5 1.4 33.1 9.5 68.8 14.8 105.7 14.8 6 0 11.9-.1 17.8-.4-7.1-21-10.9-43.1-10.9-66 0-135.8 132.2-245.8 295.3-245.8zm-194.3-86.5c23.8 0 43.2 19.3 43.2 43.1s-19.3 43.1-43.2 43.1c-23.8 0-43.2-19.3-43.2-43.1s19.4-43.1 43.2-43.1zm-215.9 86.2c-23.8 0-43.2-19.3-43.2-43.1s19.3-43.1 43.2-43.1 43.2 19.3 43.2 43.1-19.4 43.1-43.2 43.1zm586.8 415.6c56.9-41.2 93.2-102 93.2-169.7 0-124-120.8-224.5-269.9-224.5-149 0-269.9 100.5-269.9 224.5S540.9 847.5 690 847.5c30.8 0 60.6-4.4 88.1-12.3 2.6-.8 5.2-1.2 7.9-1.2 5.2 0 9.9 1.6 14.3 4.1l59.1 34c1.7 1 3.3 1.7 5.2 1.7a9 9 0 0 0 6.4-2.6 9 9 0 0 0 2.6-6.4c0-2.2-.9-4.4-1.4-6.6-.3-1.2-7.6-28.3-12.2-45.3-.5-1.9-.9-3.8-.9-5.7.1-5.9 3.1-11.2 7.6-14.5zM600.2 587.2c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9c0 19.8-16.2 35.9-36 35.9zm179.9 0c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9a36.08 36.08 0 0 1-36 35.9z" />
            </svg>
          </a>

          <div className="relative group" ref={qrRef}>
            <button
              onClick={() => setShowStoreQR((s) => !s)}
              aria-label="Toggle purchase QR code"
              aria-expanded={showStoreQR}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f1f2e]/80 backdrop-blur-md flex items-center justify-center text-aurora-white hover:bg-[#7928ca] hover:scale-110 focus:scale-110 transition-all duration-100 shadow-lg border border-white/5 outline-none"
            >
              <ShoppingCart size={18} className="md:w-5 md:h-5" />
            </button>
            {/* Store QR Code Tooltip - click toggles on mobile; hover still works on desktop */}
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 transition-all duration-100 z-50 ${showStoreQR ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'} md:group-hover:opacity-100 md:group-hover:visible md:group-hover:pointer-events-auto`}>
              <div className="bg-[#1f1f2e]/90 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-xl flex flex-col items-center">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden relative">
                  <span className="text-xs text-white/50 absolute text-center px-2">请上传二维码至<br />public/images/store/qrcode.png</span>
                  <img src={getAssetUrl("/images/store/qrcode.png")} alt="Purchase QR Code" width="331" height="331" loading="lazy" decoding="async" className="w-full h-full object-cover relative z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1f1f2e] rotate-45 border-r border-b border-white/10"></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
