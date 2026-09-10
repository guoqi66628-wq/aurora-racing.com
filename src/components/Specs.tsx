import { getAssetUrl } from "../utils/cdn";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useMousePositionVar } from "../hooks/useMousePosition";
import { useLiquidGlass } from "../hooks/useLiquidGlass";
import { useIsMobile } from "../hooks/useIsMobile";

interface EventResult {
  /** 赛事名称，显示在胶囊内部左侧 */
  event: string;
  skidpad?: string;
  skidpadRank?: number;
  sprintDuel?: string;
  sprintDuelRank?: number;
  acceleration?: string;
  accelerationRank?: number;
  autocross?: string;
  autocrossRank?: number;
  endurance?: string;
  enduranceRank?: number;
  enduranceColor?: string;
}

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
  /** 一辆车可能参加多项赛事，按顺序堆叠展示 */
  results?: EventResult[];
}

/** 胶囊内成绩项的渲染顺序，缺失的项目自动跳过 */
const METRIC_ORDER = [
  { key: "skidpad", rankKey: "skidpadRank", label: "Skidpad" },
  { key: "sprintDuel", rankKey: "sprintDuelRank", label: "Sprint Duel" },
  { key: "acceleration", rankKey: "accelerationRank", label: "Acceleration" },
  { key: "autocross", rankKey: "autocrossRank", label: "Autocross" },
  { key: "endurance", rankKey: "enduranceRank", label: "Endurance" },
] as const;

const carData: CarData[] = [
  {
    year: 2021,
    highlight: "初露锋芒",
    image: getAssetUrl("/images/cars/car-2021.webp"),
  },
  {
    year: 2022,
    highlight: "轮边电机",
    image: getAssetUrl("/images/cars/car-2022.webp"),
  },
  {
    year: 2023,
    highlight: "空气动力学升级",
    image: getAssetUrl("/images/cars/car-2023.webp"),
    specs: { weight: "265kg", wheelbase: "1560mm", track: "1220/1180mm" },
    results: [
      { event: "FSC", skidpad: "5.08s", skidpadRank: 5, acceleration: "4.57s", accelerationRank: 9, autocross: "73.627s", autocrossRank: 2, endurance: "1735.571s", enduranceRank: 7, enduranceColor: "text-[#a5d6a7]" }
    ]
  },
  {
    year: 2024,
    highlight: "第二代单体壳",
    image: getAssetUrl("/images/cars/car-2024.webp"),
    specs: { weight: "224kg", wheelbase: "1540mm", track: "1240/1220mm" },
    results: [
      { event: "FSC", skidpad: "5.12s", skidpadRank: 2, acceleration: "3.72s", accelerationRank: 1, autocross: "73.199s", autocrossRank: 15, endurance: "1654.519s", enduranceRank: 2, enduranceColor: "text-[#a5d6a7]" }
    ]
  },
  {
    year: 2025,
    highlight: "动力系统重构",
    image: getAssetUrl("/images/cars/car-2025.webp"),
    specs: { weight: "219kg", wheelbase: "1530mm", track: "1270mm" },
    results: [
      { event: "FSC", skidpad: "4.92s", skidpadRank: 1, acceleration: "3.81s", accelerationRank: 2, autocross: "65.111s", autocrossRank: 3, endurance: "DNF", enduranceColor: "text-rose-500" },
      { event: "FSTC", sprintDuel: "-", acceleration: "3.72s", accelerationRank: 1, autocross: "54.279s", autocrossRank: 1, endurance: "1422.993s", enduranceRank: 5, enduranceColor: "text-[#a5d6a7]" }
    ]
  },
  {
    year: 2026,
    highlight: "全面进化",
    image: getAssetUrl("/images/cars/car-2026.webp"),
    specs: { weight: "199kg", wheelbase: "1530mm", track: "1250mm" },
    results: [
      { event: "FSS", skidpad: "4.979s", skidpadRank: 9, acceleration: "3.489s", accelerationRank: 6, autocross: "86.175s", autocrossRank: 9, endurance: "DQ", enduranceColor: "text-aurora-white" },
      // FSC 尚未开赛，占位
      { event: "FSC", skidpad: "-", acceleration: "-", autocross: "-", endurance: "-", enduranceColor: "text-aurora-white" }
    ]
  }
];

/** 已发起预取的图片 URL，避免重复 new Image() */
const preloadedImages = new Set<string>();

const yearNameMap: Record<number, string> = {
  2021: "E23",
  2022: "E24",
  2023: "E07",
  2024: "E03",
  2025: "E02",
  2026: "E27",
};

export default function Specs() {
  const [activeYear, setActiveYear] = useState(() => {
    const stored = sessionStorage.getItem('selectedCarYear');
    if (stored) {
      sessionStorage.removeItem('selectedCarYear');
      return Number(stored);
    }
    return 2026;
  });
  const [direction, setDirection] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  // 移动端整段常驻挂载，桌面 hero 图层是 hidden md:flex —— 不能让它在移动端 eager 拉六张图
  const isMobile = useIsMobile();

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

  // 提前把相邻年份的图片放进 HTTP 缓存。桌面端所有图层常驻已经顺带完成预取，
  // 这里主要是给移动端卡片用：卡片每次滑动都重新挂载 <img>，没预热就会先空一拍。
  useEffect(() => {
    if (activeIndex < 0) return;
    const neighbors = [
      carData[(activeIndex + 1) % carData.length],
      carData[(activeIndex - 1 + carData.length) % carData.length],
    ];
    for (const car of neighbors) {
      if (preloadedImages.has(car.image)) continue;
      preloadedImages.add(car.image);
      const img = new Image();
      img.decoding = "async";
      img.src = car.image;
    }
  }, [activeIndex]);

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
              aria-label={`Show ${yearNameMap[car.year]} specs`}
              aria-pressed={activeYear === car.year}
              className="relative z-10 flex flex-col items-center gap-1 group flex-1"
            >
              <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-300 border-[3px] ${activeYear === car.year ? 'bg-purple-600 border-purple-200 shadow-sm scale-125' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}></div>
              <span className={`font-display text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap mt-1 ${activeYear === car.year ? 'text-purple-600' : 'text-slate-400'}`}>
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
              aria-label={`Show AURORA-${car.year.toString().slice(-2)} specs`}
              aria-pressed={activeYear === car.year}
              className={`relative z-10 flex items-center justify-center w-full h-full iso-pro group/btn ${activeYear === car.year ? 'active' : ''}`}
            >
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10">
                <span className="iso-layer absolute left-0 top-0"></span>
                <span className="iso-layer absolute left-0 top-0"></span>
                <span className="iso-layer absolute left-0 top-0"></span>
                <div className={`iso-dot w-4 h-4 rounded-full transition-all duration-300 border-2 relative z-10 ${activeYear === car.year ? 'bg-[#7928CA] border-[#7928CA] shadow-[0_0_15px_#7928CA] scale-125' : 'bg-[#0a0a0a] border-white/40 group-hover/btn:border-[#7928CA]/80 group-hover/btn:scale-110'}`}></div>
              </div>
              <span className={`iso-text absolute left-[60%] font-display font-bold drop-shadow-md whitespace-nowrap ${activeYear === car.year ? 'text-[#7928CA] text-xl' : 'text-white/70 text-lg group-hover/btn:text-[#7928CA]/80'}`}>
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
              <img src={activeCar.image} alt={`Aurora Racing Car ${activeCar.year}`} width="800" height="600" loading="lazy" decoding="async" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col w-full">
              <div className="flex justify-between items-end mb-4">
                <h3 className="font-display text-2xl font-black text-black tracking-tight drop-shadow-sm">AURORA-{activeCar.year.toString().slice(-2)}</h3>
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
          {/*
            所有年份的图层常驻挂载，只切 opacity 做交叉淡入。
            之前用 AnimatePresence mode="wait" 会先卸载旧图、等新图挂载并解码，
            中间那几帧没有任何图片，深色底直接透出来 —— 就是切换时的黑屏。
          */}
          {(isMobile ? carData.filter((c) => c.year === activeYear) : carData).map((car) => {
            const isActive = car.year === activeYear;
            return (
              <motion.div
                key={car.year}
                aria-hidden={!isActive}
                initial={false}
                // 两层同向缩放：进入的从 1.02 收到 1，退出的停在 1.02，
                // 避免一层放大一层缩小在交叉淡入中段互相抵消成抖动
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: shouldReduceMotion ? 1 : isActive ? 1 : 1.02,
                }}
                transition={{
                  opacity: { duration: 0.32, ease: "easeInOut" },
                  scale: { duration: 0.45, ease: [0.23, 1, 0.32, 1] },
                }}
                style={{ zIndex: isActive ? 1 : 0 }}
                className="absolute inset-0 md:flex md:items-center md:justify-center pointer-events-none"
              >
                <img
                  src={car.image}
                  alt={`Aurora Racing Car ${car.year}`}
                  width="1672"
                  height="941"
                  // 常驻图层必须 eager：lazy 图在 opacity:0 时可能被推迟到切换那一刻才取，
                  // 那就等于没预热。六张 webp 合计约 600KB，且这一段整体是懒挂载的。
                  loading="eager"
                  decoding="async"
                  fetchPriority={isActive ? "high" : "low"}
                  className="w-full h-full md:object-cover md:object-center md:opacity-100"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            );
          })}
          {/* 渐变遮罩独立于图层，不随图片一起淡入淡出 */}
          <div className="hidden md:block absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t md:from-[#0a0a0a]/80 md:via-transparent md:to-[#0a0a0a]/30"></div>
          <div className="hidden md:block absolute inset-0 z-[2] pointer-events-none bg-gradient-to-r from-[#0a0a0a]/40 via-transparent to-[#0a0a0a]/40"></div>
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
                transition={{ duration: 0.15 }}
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
                  {activeCar.results?.length ? (
                    <PerformanceStack key={`perf-${activeYear}`} results={activeCar.results} />
                  ) : <div key={`perf-empty-${activeYear}`} />}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * 赛事成绩胶囊堆叠。多场赛事时后面的胶囊向下偏移、缩小并降低透明度露出边缘，
 * 点击最前面那张即轮换到下一场赛事。单场赛事时退化成一张普通胶囊。
 */
function PerformanceStack({ results }: { results: EventResult[] }) {
  const [front, setFront] = useState(0);
  const total = results.length;

  // 切换年份时组件重挂载，front 自然回到 0；此处仅防御 results 长度变化
  useEffect(() => setFront(0), [total]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15, delay: 0.05 }}
      className="relative w-full md:w-auto flex justify-center items-start"
      // 给后面露出的边缘留出高度，容器本身高度由最前面那张（relative）决定
      style={{ paddingBottom: total > 1 ? (total - 1) * 14 : 0 }}
    >
      {results.map((result, i) => {
        // 相对最前面那张的层级：0 在最前，往后递增
        const depth = (i - front + total) % total;
        return (
          <PerformanceBar
            key={result.event}
            result={result}
            depth={depth}
            // 只让第一张参与文档流撑开容器尺寸，其余绝对定位叠上去。
            // 锚点固定为 i===0（而不是当前最前那张），切换时才不会发生定位模式跳变。
            stacked={total > 1}
            anchor={i === 0}
            // 只有最前面那张可点，点一下轮换到下一场；后面的不接收指针事件
            onSelect={total > 1 && depth === 0 ? () => setFront((f) => (f + 1) % total) : undefined}
          />
        );
      })}
    </motion.div>
  );
}

function PerformanceBar({
  result,
  depth,
  stacked,
  anchor,
  onSelect,
}: {
  result: EventResult;
  depth: number;
  stacked: boolean;
  anchor: boolean;
  onSelect?: () => void;
}) {
  const perfRef = useRef<HTMLDivElement>(null);
  useMousePositionVar(perfRef);
  // 宽度随内容变，单独一张贴图（不与固定宽的 LiquidSpec 共享）
  useLiquidGlass(perfRef, "pill");

  const metrics = METRIC_ORDER.filter((m) => result[m.key] !== undefined);

  return (
    <motion.div
      ref={perfRef}
      onClick={onSelect}
      animate={{
        y: depth * 14,
        scale: 1 - depth * 0.04,
        opacity: depth === 0 ? 1 : 0.55,
        // 绝对定位那几张要自己抵消 left:50%
        x: stacked && !anchor ? "-50%" : 0,
      }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      style={
        stacked && !anchor
          ? // 非锚点胶囊绝对定位居中，不撑开容器高度
            { zIndex: 10 - depth, position: "absolute", top: 0, left: "50%" }
          : { zIndex: 10 - depth, position: "relative" }
      }
      className={`liquid-glass w-full md:w-auto px-4 sm:px-8 md:px-10 py-4 sm:py-5 flex flex-wrap sm:flex-nowrap md:flex-row items-center justify-between sm:justify-center md:justify-center gap-y-2 sm:gap-6 rounded-2xl md:rounded-full md:mx-0 ${
        onSelect ? "cursor-pointer" : ""
      } ${stacked && depth !== 0 ? "pointer-events-none" : ""}`}
    >
      {/* 赛事名称：车身 AURORA 字标的同款处理 */}
      <span className="event-wordmark text-base sm:text-xl md:text-2xl uppercase whitespace-nowrap leading-none" data-event={result.event}>
        {result.event}
      </span>
      <div className="hidden sm:block w-px h-6 bg-slate-300 md:bg-white/20"></div>

      {metrics.map((m, idx) => (
        <div key={m.key} className="flex items-center gap-3 sm:gap-6">
          {idx > 0 && <div className="hidden sm:block w-px h-6 bg-slate-300 md:bg-white/20"></div>}
          <BottomSpecItem
            label={m.label}
            value={result[m.key] as string}
            rank={result[m.rankKey] as number | undefined}
            green={m.key !== "endurance"}
            enduranceColor={m.key === "endurance" ? result.enduranceColor : undefined}
          />
        </div>
      ))}
    </motion.div>
  );
}

function BottomSpecItem({ label, value, rank }: { label: string, value: string, rank?: number }) {
  let vColor = "";
  let rankColor = "";

  // P1/P2/P3 保留奖牌色，其余一律白色（桌面）/ 深色（移动端浅底）
  if (rank === 1) {
    vColor = "text-yellow-600 md:text-yellow-400";
    rankColor = "text-yellow-600 md:text-yellow-400";
  } else if (rank === 2) {
    vColor = "text-slate-400 md:text-slate-300";
    rankColor = "text-slate-400 md:text-slate-300";
  } else if (rank === 3) {
    vColor = "text-orange-600 md:text-orange-400";
    rankColor = "text-orange-600 md:text-orange-400";
  } else {
    vColor = "text-slate-800 md:text-white";
    rankColor = "text-slate-500 md:text-white/60";
  }

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap">
      <span className="text-slate-500 md:text-white/90 text-[10px] sm:text-sm md:text-base font-medium">{label}:</span>
      <span className={`text-xs sm:text-base md:text-lg font-bold flex items-center gap-1 ${vColor}`}>
        {value}
        {rank && <span className={`text-xs sm:text-sm md:text-base font-bold ${rankColor} ml-0.5`}>(P{rank})</span>}
      </span>
    </div>
  );
}

function LiquidSpec({ label, value, purple }: { label: string, value: string, purple?: boolean }) {
  const specRef = useRef<HTMLDivElement>(null);
  useMousePositionVar(specRef);
  // 桌面端固定 md:w-[320px] 且圆角一致 -> 命中尺寸分桶，四个胶囊共享同一张贴图
  useLiquidGlass(specRef, "pill");

  return (
    <div
      ref={specRef}
      className="liquid-glass px-3 py-3 md:px-6 md:py-3 flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] items-center justify-center gap-1 md:gap-0 w-full md:w-[320px] rounded-2xl md:rounded-full"
    >
      <span className="text-slate-500 md:text-white/90 text-[10px] sm:text-xs md:text-xl font-medium uppercase md:normal-case tracking-wider md:tracking-normal md:text-right md:pr-1">{label}</span>
      <span className="hidden md:inline text-white/90 text-xl font-medium">:</span>
      <span className={`text-sm sm:text-lg md:text-2xl font-bold md:col-start-3 md:text-left md:pl-2 ${purple ? "text-purple-600 md:text-[#ce93d8]" : "text-emerald-600 md:text-[#a5d6a7]"}`}>{value}</span>
    </div>
  );
}
