import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface CarData {
  year: number;
  highlight: string;
  image: string;
  specs?: {
    weight: string;
    wheelbase: string;
    track?: string;
    monocoque?: string;
    chassis?: string;
  };
  performance?: {
    skidpad: string;
    skidpadRank?: number;
    acceleration: string;
    accelerationRank?: number;
    autocross: string;
    autocrossRank?: number;
    endurance: string;
    enduranceRank?: number;
    enduranceColor: string;
  };
}

const carData: CarData[] = [
  {
    year: 2021,
    highlight: "初露锋芒",
    image: "/images/cars/car-2021.webp",
  },
  {
    year: 2022,
    highlight: "轮边电机",
    image: "/images/cars/car-2022.webp",
  },
  {
    year: 2023,
    highlight: "空气动力学升级",
    image: "/images/cars/car-2023.webp",
    specs: { weight: "265kg", wheelbase: "1560mm", track: "1220/1180mm" },
    performance: { skidpad: "5.08s", skidpadRank: 5, acceleration: "4.57s", accelerationRank: 9, autocross: "73.627s", autocrossRank: 2, endurance: "1735.571s", enduranceRank: 7, enduranceColor: "text-[#a5d6a7]" }
  },
  {
    year: 2024,
    highlight: "第二代单体壳",
    image: "/images/cars/car-2024.webp",
    specs: { weight: "224kg", wheelbase: "1540mm", track: "1240/1220mm" },
    performance: { skidpad: "5.12s", skidpadRank: 2, acceleration: "3.72s", accelerationRank: 1, autocross: "73.199s", autocrossRank: 15, endurance: "1654.519s", enduranceRank: 2, enduranceColor: "text-[#a5d6a7]" }
  },
  {
    year: 2025,
    highlight: "动力系统重构",
    image: "/images/cars/car-2025.webp",
    specs: { weight: "219kg", wheelbase: "1530mm", track: "1270mm" },
    performance: { skidpad: "4.92s", skidpadRank: 1, acceleration: "3.81s", accelerationRank: 2, autocross: "65.111s", autocrossRank: 3, endurance: "DNF", enduranceColor: "text-rose-500" }
  },
  {
    year: 2026,
    highlight: "全面进化",
    image: "/images/cars/car-2026.webp",
    specs: { weight: "200kg", wheelbase: "1530mm", track: "1250mm" },
    performance: { skidpad: "-", acceleration: "-", autocross: "-", endurance: "-", enduranceColor: "text-aurora-white" }
  }
];

const yearNameMap: Record<number, string> = {
  2021: "E23",
  2022: "E24",
  2023: "E07",
  2024: "E03",
  2025: "E02",
  2026: "E27",
};

export default function Specs() {
  const [activeYear, setActiveYear] = useState(2026);
  const [direction, setDirection] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleYearChange = (e: CustomEvent<number>) => {
      setDirection(e.detail > activeYear ? 1 : -1);
      setActiveYear(e.detail);
    };
    window.addEventListener('changeCarYear', handleYearChange as EventListener);
    return () => window.removeEventListener('changeCarYear', handleYearChange as EventListener);
  }, [activeYear]);

  const activeIndex = carData.findIndex(c => c.year === activeYear);
  const activeCar = carData[activeIndex] || carData[carData.length - 1];

  const handleNext = () => {
    setDirection(1);
    const nextIndex = (activeIndex + 1) % carData.length;
    setActiveYear(carData[nextIndex].year);
  };

  const handlePrev = () => {
    setDirection(-1);
    const prevIndex = (activeIndex - 1 + carData.length) % carData.length;
    setActiveYear(carData[prevIndex].year);
  };

  return (
    <section
      id="specs"
      className="relative w-full flex flex-col items-center pt-6 pb-2 overflow-hidden group/section h-auto bg-slate-50 md:block md:p-0 md:h-[100dvh] md:bg-[#0a0a0a]"
    >
      {/* Timeline - Mobile (Top) */}
      <div className="md:hidden w-full px-4 mb-4">
        <div className="flex items-center justify-between w-full relative">
          <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-slate-200 -translate-y-1/2 z-0"></div>
          {carData.map(car => (
            <button 
              key={car.year} 
              onClick={() => {
                if (activeYear !== car.year) {
                  setDirection(car.year > activeYear ? 1 : -1);
                  setActiveYear(car.year);
                }
              }} 
              className="relative z-10 flex flex-col items-center gap-1 group flex-1"
            >
              <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-300 border-[3px] ${activeYear === car.year ? 'bg-purple-600 border-purple-200 shadow-sm scale-125' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}></div>
              <span className={`font-mono text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap mt-1 ${activeYear === car.year ? 'text-purple-600' : 'text-slate-400'}`}>
                {yearNameMap[car.year]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline - Desktop (Left) */}
      <div className="hidden md:flex absolute items-center w-40 z-40 bg-transparent pointer-events-none left-0 top-0 bottom-0 flex-col justify-center py-20">
        <div className="absolute left-1/2 top-32 bottom-32 w-px bg-white/20 -translate-x-1/2"></div>
        {carData.map((car) => (
          <div key={car.year} className="relative flex-1 flex items-center justify-center w-full group pointer-events-auto">
            <button 
              onClick={() => {
                if (activeYear !== car.year) {
                  setDirection(car.year > activeYear ? 1 : -1);
                  setActiveYear(car.year);
                }
              }} 
              className={`relative z-10 flex items-center justify-center w-full h-full iso-pro group/btn ${activeYear === car.year ? 'active' : ''}`}
            >
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10">
                <span className="iso-layer absolute left-0 top-0"></span>
                <span className="iso-layer absolute left-0 top-0"></span>
                <span className="iso-layer absolute left-0 top-0"></span>
                <div className={`iso-dot w-4 h-4 rounded-full transition-all duration-300 border-2 relative z-10 ${activeYear === car.year ? 'bg-[#7928CA] border-[#7928CA] shadow-[0_0_15px_#7928CA] scale-125' : 'bg-[#0a0a0a] border-white/40 group-hover/btn:border-[#7928CA]/80 group-hover/btn:scale-110'}`}></div>
              </div>
              <span className={`iso-text absolute left-[60%] font-mono font-bold drop-shadow-md whitespace-nowrap ${activeYear === car.year ? 'text-[#7928CA] text-xl' : 'text-white/70 text-lg group-hover/btn:text-[#7928CA]/80'}`}>
                AURORA-{car.year.toString().slice(-2)}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Navigation Arrows (Desktop) */}
      <div className="absolute inset-y-0 right-0 w-24 z-30 hidden md:flex items-center justify-end pr-6 pointer-events-none">
        <button 
          onClick={handleNext}
          className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#7928CA]/80 hover:border-[#7928CA] transition-all duration-300 pointer-events-auto shadow-lg opacity-0 group-hover/section:opacity-100 translate-x-4 group-hover/section:translate-x-0"
          aria-label="Next Car"
        >
          <ChevronRight size={32} />
        </button>
      </div>
      
      <div className="absolute inset-y-0 left-40 w-24 z-30 hidden md:flex items-center justify-start pl-6 pointer-events-none">
        <button 
          onClick={handlePrev}
          className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#7928CA]/80 hover:border-[#7928CA] transition-all duration-300 pointer-events-auto shadow-lg opacity-0 group-hover/section:opacity-100 -translate-x-4 group-hover/section:translate-x-0"
          aria-label="Previous Car"
        >
          <ChevronLeft size={32} />
        </button>
      </div>

      {/* Mobile Main Content Area (Card) */}
      <div className="md:hidden w-full max-w-sm mx-auto px-4 relative z-20 flex-1 flex flex-col mt-2 mb-10 overflow-visible">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={`mobile-card-${activeYear}`}
            custom={direction}
            variants={
              shouldReduceMotion
                ? {
                    enter: { opacity: 0 },
                    center: { opacity: 1 },
                    exit: { opacity: 0 },
                  }
                : {
                    enter: (dir: number) => ({
                      x: dir > 0 ? "100%" : "-100%",
                      opacity: 0,
                      scale: 0.95,
                      filter: "blur(4px)",
                      boxShadow: "0px 0px 0px rgba(0,0,0,0)",
                    }),
                    center: {
                      zIndex: 1,
                      x: 0,
                      opacity: 1,
                      scale: 1,
                      filter: "blur(0px)",
                      boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
                    },
                    exit: (dir: number) => ({
                      zIndex: 0,
                      x: dir < 0 ? "40%" : "-40%",
                      opacity: 0,
                      scale: 0.85,
                      filter: "blur(8px)",
                      boxShadow: "0px 0px 0px rgba(0,0,0,0)",
                    }),
                  }
            }
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 350, damping: 35, mass: 1 },
              opacity: { duration: 0.3, ease: "easeInOut" },
              scale: { duration: 0.4, ease: "easeOut" },
              filter: { duration: 0.3, ease: "easeInOut" },
              boxShadow: { duration: 0.4, ease: "easeOut" }
            }}
            drag={shouldReduceMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            onDragEnd={(_, info) => {
              const swipeThreshold = 50;
              const velocityThreshold = 400;
              if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) handlePrev();
              else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) handleNext();
            }}
            className="bg-white rounded-3xl border border-slate-200/50 overflow-hidden flex flex-col w-full relative touch-none hover:cursor-grab active:cursor-grabbing will-change-[transform,opacity,filter]"
          >
            {/* Image */}
            <div className="w-full aspect-[4/3] bg-slate-50 relative flex items-center justify-center overflow-hidden">
              <img src={activeCar.image} alt={`Aurora Racing Car ${activeCar.year}`} width="800" height="600" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col w-full">
              <div className="flex justify-between items-end mb-4">
                <h3 className="font-mono text-2xl font-black text-black tracking-tight drop-shadow-sm">AURORA-{activeCar.year.toString().slice(-2)}</h3>
              </div>
              
              {activeCar.specs && (
                <div className="flex flex-col w-full gap-0">
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-black font-medium text-sm tracking-wide">Weight</span>
                    <span className="font-bold text-black text-base">{activeCar.specs.weight}</span>
                  </div>
                  {activeCar.specs.track && (
                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                      <span className="text-black font-medium text-sm tracking-wide">Track</span>
                      <span className="font-bold text-black text-base">{activeCar.specs.track}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-3">
                    <span className="text-black font-medium text-sm tracking-wide">Wheelbase</span>
                    <span className="font-bold text-black text-base">{activeCar.specs.wheelbase}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop Main Content Area */}
      <div className="hidden md:flex w-full md:max-w-none flex-col md:h-full md:absolute md:inset-0 md:px-0">
        {/* Car Image - Desktop Hero */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0}
          onDragEnd={(_, info) => {
            const swipeThreshold = 70;
            const velocityThreshold = 500;
            if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) handlePrev();
            else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) handleNext();
          }}
          className="md:absolute md:inset-0 md:z-0 md:overflow-hidden md:flex md:items-center md:justify-center md:pt-20 md:pb-40 w-full md:aspect-auto md:w-auto rounded-none overflow-hidden border-none relative bg-transparent flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeYear}
              initial={{ opacity: 0, scale: 1.02, filter: "blur(0px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="absolute inset-0 md:flex md:items-center md:justify-center pointer-events-none"
            >
              <img
                src={activeCar.image}
                alt={`Aurora Racing Car ${activeCar.year}`}
                width="1672"
                height="941"
                className="w-full h-full md:object-cover md:object-center md:opacity-100"
                referrerPolicy="no-referrer"
              />
              <div className="hidden md:block absolute inset-0 bg-gradient-to-t md:from-[#0a0a0a]/80 md:via-transparent md:to-[#0a0a0a]/30"></div>
              <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/40 via-transparent to-[#0a0a0a]/40"></div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Specs Cards */}
        <div className="w-full mt-6 md:mt-0 flex flex-col gap-4 md:gap-0 z-20 md:relative md:flex-1 md:justify-end md:p-12 md:pointer-events-none md:pb-[60px]">
          
          <div className="flex flex-col gap-4 justify-center items-center md:items-end w-full md:gap-4 md:mt-auto md:pointer-events-auto">
            {/* Top Specs */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={`specs-${activeYear}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-col gap-3 md:gap-4 w-full md:w-auto md:absolute md:top-24 md:right-16 md:grid-cols-none md:items-end"
              >
                {activeCar.specs && (
                  <>
                    <LiquidSpec label="Weight" value={activeCar.specs.weight} />
                    {activeCar.specs.track && (
                      <LiquidSpec label="Track" value={activeCar.specs.track} />
                    )}
                    <LiquidSpec label="Wheelbase" value={activeCar.specs.wheelbase} />
                    {(activeCar.specs.monocoque || activeCar.specs.chassis) && (
                      <LiquidSpec label={activeCar.specs.monocoque ? "Monocoque" : "Chassis"} value={activeCar.specs.monocoque || activeCar.specs.chassis || ""} purple />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Bottom Specs */}
            <div className="hidden md:flex w-full justify-center md:pb-10">
              <AnimatePresence mode="wait">
                  {activeCar.performance ? (
                    <motion.div 
                      key={`perf-${activeYear}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="liquid-glass w-full md:w-auto px-4 sm:px-8 md:px-10 py-4 sm:py-5 flex flex-wrap sm:flex-nowrap md:flex-row items-center justify-between sm:justify-center md:justify-center gap-y-2 sm:gap-6 rounded-2xl md:rounded-full md:mx-0"
                    >
                      <>
                        <BottomSpecItem label="Skidpad" value={activeCar.performance.skidpad} rank={activeCar.performance.skidpadRank} green />
                        <div className="hidden sm:block w-px h-6 bg-slate-300 md:bg-white/20"></div>
                        <BottomSpecItem label="Acceleration" value={activeCar.performance.acceleration} rank={activeCar.performance.accelerationRank} green />
                        <div className="hidden sm:block w-px h-6 bg-slate-300 md:bg-white/20"></div>
                        <BottomSpecItem label="Autocross" value={activeCar.performance.autocross} rank={activeCar.performance.autocrossRank} green />
                        <div className="hidden md:block w-px h-6 bg-slate-300 md:bg-white/20"></div>
                        <BottomSpecItem label="Endurance" value={activeCar.performance.endurance} rank={activeCar.performance.enduranceRank} enduranceColor={activeCar.performance.enduranceColor} />
                      </>
                    </motion.div>
                  ) : <div key={`perf-empty-${activeYear}`} />}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BottomSpecItem({ label, value, rank, green, defaultColor, enduranceColor }: { label: string, value: string, rank?: number, green?: boolean, defaultColor?: boolean, enduranceColor?: string }) {
  let vColor = "";
  if (enduranceColor) {
    if (enduranceColor === "text-aurora-white") vColor = "text-slate-800 md:text-white";
    else vColor = "text-emerald-600 md:text-[#a5d6a7]";
  } else if (green) {
    vColor = "text-emerald-600 md:text-[#a5d6a7]";
  } else if (defaultColor) {
    vColor = "text-slate-800 md:text-white";
  }

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap">
      <span className="text-slate-500 md:text-white/90 text-[10px] sm:text-sm md:text-base font-medium">{label}:</span>
      <span className={`text-xs sm:text-base md:text-lg font-bold flex items-center gap-1 ${vColor}`}>
        {value}
        {rank && <span className="text-xs sm:text-sm md:text-base font-bold text-slate-400 md:text-slate-400/90 ml-0.5">(P{rank})</span>}
      </span>
    </div>
  );
}

function LiquidSpec({ label, value, purple }: { label: string, value: string, purple?: boolean }) {
  return (
    <div className="liquid-glass px-3 py-3 md:px-6 md:py-3 flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] items-center justify-center gap-1 md:gap-0 w-full md:w-[320px] rounded-2xl md:rounded-full cursor-pointer">
      <span className="text-slate-500 md:text-white/90 text-[10px] sm:text-xs md:text-xl font-medium uppercase md:normal-case tracking-wider md:tracking-normal md:text-right md:pr-1">{label}</span>
      <span className="hidden md:inline text-white/90 text-xl font-medium">:</span>
      <span className={`text-sm sm:text-lg md:text-2xl font-bold md:col-start-3 md:text-left md:pl-2 ${purple ? "text-purple-600 md:text-[#ce93d8]" : "text-emerald-600 md:text-[#a5d6a7]"}`}>{value}</span>
    </div>
  );
}
