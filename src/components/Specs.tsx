import { getAssetUrl } from "../utils/cdn";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, animate } from "motion/react";
import { flushSync } from "react-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
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

// 每组三色由对应赛车图片采样，避免移动端实时模糊多张大图。
const carBackgrounds: Record<number, string> = {
  2021: "#928696, #67596b, #7b6a88",
  2022: "#575563, #595763, #82808f",
  2023: "#312845, #423b4e, #3a354e",
  2024: "#2a2b31, #2d2e32, #2f3536",
  2025: "#282e2c, #363b3f, #282839",
  2026: "#22312e, #2c2e31, #242728",
};

function MobileCarCarousel({ cars, activeIndex, onPrevious, onNext, onDragProgress }: { cars: CarData[]; activeIndex: number; onPrevious: () => void; onNext: () => void; onDragProgress: (progress: number | null) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const moving = useRef(false);
  const startX = useRef<number | null>(null);
  const distance = useRef(0);
  const cardStep = useRef(1);
  const x = useMotionValue(0);
  const indexes = [-2, -1, 0, 1, 2].map((offset) => (activeIndex + offset + cars.length) % cars.length);

  return (
    <div ref={viewport} className="md:hidden w-full max-w-lg mx-auto relative z-20 mt-2 mb-2 overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing" style={{ touchAction: "pan-y" }}
      onPointerDown={(event) => {
        if (moving.current || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
        startX.current = event.clientX;
        distance.current = 0;
        cardStep.current = (viewport.current?.querySelector<HTMLElement>("[data-car-card]")?.getBoundingClientRect().width || 0) + 12;
        x.stop();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (startX.current === null) return;
        const step = cardStep.current;
        distance.current = Math.max(-step, Math.min(step, event.clientX - startX.current));
        x.set(distance.current);
        onDragProgress(-distance.current / step);
      }}
      onPointerUp={async () => {
        if (startX.current === null || moving.current) return;
        startX.current = null;
        moving.current = true;
        const step = cardStep.current;
        const change = Math.abs(distance.current) >= 24 ? (distance.current < 0 ? 1 : -1) : 0;
        await animate(x, -change * step, { type: "spring", stiffness: 320, damping: 34, onUpdate: (value) => onDragProgress(-value / step) });
        flushSync(() => { if (change) change > 0 ? onNext() : onPrevious(); onDragProgress(null); });
        x.set(0);
        distance.current = 0;
        moving.current = false;
      }}
      onPointerCancel={() => { startX.current = null; distance.current = 0; const step = cardStep.current; animate(x, 0, { type: "spring", stiffness: 320, damping: 34, onUpdate: (value) => onDragProgress(-value / step), onComplete: () => onDragProgress(null) }); }}>
      <motion.div className="flex gap-3 items-start pt-4 pb-7" style={{ x, marginLeft: "calc(50% - min(50vw - 16px, 176px) - min(100vw - 32px, 352px) - min(100vw - 32px, 352px) - 24px)" }}>
        {indexes.map((index, position) => {
          const car = cars[index];
          return <div key={car.year} data-car-card aria-hidden={position !== 2} className="shrink-0 w-[min(calc(100vw-32px),352px)] bg-white rounded-3xl border border-slate-200/50 overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.05)] select-none">
            <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden"><img src={car.image} alt={`Aurora Racing Car ${car.year}`} width="800" height="600" loading="eager" decoding="async" draggable={false} className="w-full h-full object-cover" style={car.year === 2024 ? { objectPosition: "75% center" } : undefined} referrerPolicy="no-referrer" /><div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 to-transparent" /></div>
            <div className="relative overflow-hidden p-6" style={{ fontFamily: '"Alibaba PuHuiTi 3", sans-serif' }}>
              <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(115deg, ${carBackgrounds[car.year]})` }} />
              <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
              <div className="relative"><h3 className="text-2xl font-semibold text-white tracking-tight mb-4">AURORA-{car.year.toString().slice(-2)}</h3>
              <div className="flex flex-col">{(car.specs ? [{ label: "重量", value: car.specs.weight }, ...(car.specs.track ? [{ label: "轮距", value: car.specs.track }] : []), { label: "轴距", value: car.specs.wheelbase }] : [{ label: "赛季", value: String(car.year) }, { label: "车号", value: yearNameMap[car.year] }, { label: car.year === 2021 ? "首次参赛" : "参赛第二年挑战四电机技术", value: "" }]).map((item, i, all) => <div key={item.label || "empty"} className={`flex min-h-[49px] justify-between items-center py-3 ${i < all.length - 1 ? "border-b border-white/15" : ""}`}><span className="text-white/80 font-medium text-sm tracking-wide">{item.label}</span><span className="font-bold text-white text-base">{item.value}</span></div>)}</div>
              </div>
            </div>
          </div>;
        })}
      </motion.div>
    </div>
  );
}

export default function Specs() {
  const timelineIndicator = useRef<HTMLDivElement>(null);
  const [activeYear, setActiveYear] = useState(() => {
    const stored = sessionStorage.getItem('selectedCarYear');
    if (stored) {
      sessionStorage.removeItem('selectedCarYear');
      return Number(stored);
    }
    return 2026;
  });

  const shouldReduceMotion = useReducedMotion();
  // 移动端整段常驻挂载，桌面 hero 图层是 hidden md:flex —— 不能让它在移动端 eager 拉六张图
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleYearChange = (e: CustomEvent<number>) => {

      setActiveYear(e.detail);
    };
    window.addEventListener('changeCarYear', handleYearChange as EventListener);
    return () => window.removeEventListener('changeCarYear', handleYearChange as EventListener);
  }, [activeYear]);

  const activeIndex = carData.findIndex(c => c.year === activeYear);
  const activeCar = carData[activeIndex] || carData[carData.length - 1];
  const updateCardDragProgress = (progress: number | null) => {
    const indicator = timelineIndicator.current;
    if (!indicator) return;
    if (progress === null) { indicator.style.transition = ""; return; }
    indicator.style.transition = "none";
    const index = Math.max(0, Math.min(carData.length - 1, activeIndex + progress));
    indicator.style.left = `${(index + .5) * 100 / carData.length}%`;
  };

  // 提前把相邻年份的图片放进 HTTP 缓存。桌面端所有图层常驻已经顺带完成预取，
  // 这里主要是给移动端卡片用：卡片每次滑动都重新挂载 <img>，没预热就会先空一拍。
  useEffect(() => {
    if (activeIndex < 0) return;
    const neighbors = [
      carData[(activeIndex + 1) % carData.length],
      carData[(activeIndex - 1 + carData.length) % carData.length],
      carData[(activeIndex + 2) % carData.length],
      carData[(activeIndex - 2 + carData.length) % carData.length],
    ];
    for (const car of neighbors) {
      if (preloadedImages.has(car.image)) continue;
      preloadedImages.add(car.image);
      const img = new Image();
      img.decoding = "async";
      img.src = car.image;
      void img.decode().catch(() => {});
    }
  }, [activeIndex]);

  const handleNext = () => {

    const nextIndex = (activeIndex + 1) % carData.length;
    setActiveYear(carData[nextIndex].year);
  };

  const handlePrev = () => {

    const prevIndex = (activeIndex - 1 + carData.length) % carData.length;
    setActiveYear(carData[prevIndex].year);
  };

  const selectTimelinePosition = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const index = Math.max(0, Math.min(carData.length - 1, Math.floor(((clientX - rect.left) / rect.width) * carData.length)));
    if (index !== activeIndex) {

      setActiveYear(carData[index].year);
    }
  };

  return (
    <section
      id="specs"
      className="relative z-10 -mt-[20vh] w-full flex flex-col items-center pt-6 pb-2 overflow-hidden group/section h-auto bg-transparent md:mt-0 md:block md:p-0 md:h-[100dvh] md:bg-[#0a0a0a]"
    >
      <MobileCarCarousel cars={carData} activeIndex={activeIndex} onPrevious={handlePrev} onNext={handleNext} onDragProgress={updateCardDragProgress} />

      {/* Timeline - Mobile */}
      <div className="md:hidden w-full px-4 mb-4">
        <div className="flex items-center justify-between w-full">
          {carData.map(car => (
            <button 
              key={car.year} 
              onClick={() => {
                if (activeYear !== car.year) {

                  setActiveYear(car.year);
                }
              }} 
              aria-label={`Show ${yearNameMap[car.year]} specs`}
              aria-pressed={activeYear === car.year}
              className="flex items-center justify-center flex-1 pt-2 pb-1"
            >
              <span style={{ fontFamily: '"Alibaba PuHuiTi 3", sans-serif' }} className={`text-base font-semibold transition-colors duration-300 whitespace-nowrap ${activeYear === car.year ? 'text-purple-600' : 'text-slate-400'}`}>
                {yearNameMap[car.year]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative h-4 flex items-center touch-none cursor-grab active:cursor-grabbing" role="slider" tabIndex={0} aria-label="选择赛车" aria-valuemin={1} aria-valuemax={carData.length} aria-valuenow={activeIndex + 1} aria-valuetext={yearNameMap[activeYear]}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); selectTimelinePosition(event.clientX, event.currentTarget); }}
          onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) selectTimelinePosition(event.clientX, event.currentTarget); }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const next = Math.max(0, Math.min(carData.length - 1, activeIndex + (event.key === "ArrowRight" ? 1 : -1)));

            setActiveYear(carData[next].year);
          }}>
          <div className="absolute inset-x-0 h-[2px] bg-slate-200" />
          <div ref={timelineIndicator} className="absolute h-[2px] w-8 -translate-x-1/2 bg-purple-600 transition-[left] duration-300 ease-out" style={{ left: `${(Math.max(0, Math.min(carData.length - 1, activeIndex)) + .5) * 100 / carData.length}%` }} />
        </div>
      </div>

      {/* Timeline - Desktop (Left) */}
      <div className="specs-timeline hidden md:flex absolute items-center w-40 z-40 bg-transparent pointer-events-none left-0 top-0 bottom-0 flex-col justify-center py-20">
        <div className="absolute left-1/2 top-32 bottom-32 w-px bg-white/20 -translate-x-1/2"></div>
        {carData.map((car) => (
          <div key={car.year} className="relative flex-1 flex items-center justify-center w-full group pointer-events-auto">
            <button 
              onClick={() => {
                if (activeYear !== car.year) {

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
      <div className="specs-arrow-next absolute inset-y-0 right-0 w-24 z-30 hidden md:flex items-center justify-end pr-6 pointer-events-none">
        <button 
          onClick={handleNext}
          className="specs-arrow w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#7928CA]/80 hover:border-[#7928CA] transition-all duration-300 pointer-events-auto shadow-lg opacity-0 group-hover/section:opacity-100 translate-x-4 group-hover/section:translate-x-0"
          aria-label="Next Car"
        >
          <ChevronRight size={32} />
        </button>
      </div>
      
      <div className="specs-arrow-prev absolute inset-y-0 left-40 w-24 z-30 hidden md:flex items-center justify-start pl-6 pointer-events-none">
        <button 
          onClick={handlePrev}
          className="specs-arrow w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#7928CA]/80 hover:border-[#7928CA] transition-all duration-300 pointer-events-auto shadow-lg opacity-0 group-hover/section:opacity-100 -translate-x-4 group-hover/section:translate-x-0"
          aria-label="Previous Car"
        >
          <ChevronLeft size={32} />
        </button>
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
                className="specs-top-cards grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-col gap-3 md:gap-4 w-full md:w-auto md:absolute md:top-24 md:right-16 md:grid-cols-none md:items-end"
              >
                {activeCar.specs && (
                  <>
                    <LiquidSpec label="Weight" value={activeCar.specs.weight} />
                    {activeCar.specs.track && (
                      <LiquidSpec label="Track" value={activeCar.specs.track} />
                    )}
                    <LiquidSpec label="Wheelbase" value={activeCar.specs.wheelbase} />
                    {(activeCar.specs.monocoque || activeCar.specs.chassis) && (
                      <LiquidSpec label={activeCar.specs.monocoque ? "Monocoque" : "Chassis"} value={activeCar.specs.monocoque || activeCar.specs.chassis || ""} />
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
      className="specs-performance relative w-full md:w-auto flex justify-center items-start"
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
      className={`liquid-glass specs-glass w-full md:w-auto px-4 sm:px-8 md:px-10 py-4 sm:py-5 flex flex-wrap sm:flex-nowrap md:flex-row items-center justify-between sm:justify-center md:justify-center gap-y-2 sm:gap-6 rounded-2xl md:rounded-full md:mx-0 ${
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

function LiquidSpec({ label, value }: { label: string, value: string }) {
  const specRef = useRef<HTMLDivElement>(null);
  // 桌面端固定 md:w-[320px] 且圆角一致 -> 命中尺寸分桶，四个胶囊共享同一张贴图
  useLiquidGlass(specRef, "pill");
  const unit = value.endsWith("mm") ? "mm" : value.endsWith("kg") ? "kg" : "";

  return (
    <div
      ref={specRef}
      className="liquid-glass specs-glass px-3 py-3 md:px-6 md:py-3 flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] items-center justify-center gap-1 md:gap-0 w-full md:w-[320px] rounded-2xl md:rounded-full"
    >
      <span className="text-white/80 text-[10px] sm:text-xs md:text-base font-medium uppercase md:normal-case tracking-wider md:tracking-normal md:text-right md:pr-1">{label}</span>
      <span className="hidden md:inline text-white/80 text-base font-medium">:</span>
      <span className="specs-value text-white text-sm sm:text-lg md:text-2xl md:col-start-3 md:text-left md:pl-2">
        {unit ? <>{value.slice(0, -unit.length)}<span className="text-xs sm:text-sm md:text-base">{unit}</span></> : value}
      </span>
    </div>
  );
}
