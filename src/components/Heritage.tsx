import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MousePointerClick } from "lucide-react";
import { getStoryImageUrl, storyCoverUrl } from "../utils/heritageImages";

type CardData = {
  id: number;
  src: string;
  isAnimatingOut?: boolean;
};

function StoryImage({ src, priority, eager }: { src: string; priority: boolean; eager: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      {!loaded && <div className={`story-image-placeholder absolute inset-0 ${failed ? "is-error" : ""}`} aria-hidden="true" />}
      <img
        src={src}
        alt=""
        width="1200"
        height="900"
        className={`relative w-full h-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      {failed && <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-600">图片暂时无法加载</span>}
    </>
  );
}

function StackedImageGallery({ images, stackDirection = "right", priority = false }: { images: string[], stackDirection?: "left" | "right", priority?: boolean }) {
  const [cards, setCards] = useState<CardData[]>(() => images.map((img, i) => ({ id: i, src: img })));
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    setCards((prev) => {
      const copy = [...prev];
      copy[0] = { ...copy[0], isAnimatingOut: true };
      return copy;
    });

    setTimeout(() => {
      setCards((prev) => {
        const copy = [...prev];
        const top = copy.shift()!;
        copy.push({ ...top, isAnimatingOut: false });
        return copy;
      });
      setIsAnimating(false);
    }, 250);
  };

  return (
    <>
    <div
      className="relative w-[85%] md:w-3/4 mx-auto aspect-[4/3] md:aspect-video cursor-pointer select-none mb-4 md:mb-0 group"
      onClick={handleNext}
    >
      {cards.map((card, index) => {
        const out = card.isAnimatingOut;

        return (
          <motion.div
            key={card.src}
            className="absolute inset-0 rounded-[1.5rem] overflow-hidden shadow-2xl"
            initial={{
              x: stackDirection === "left" ? -index * 8 : index * 8,
              y: 0,
              rotate: stackDirection === "left" ? -index * 2.5 : index * 2.5,
              scale: 1 - index * 0.03,
              zIndex: cards.length - index,
              opacity: 1,
            }}
            drag={index === 0 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              const swipeThreshold = 50;
              const velocityThreshold = 500;
              if (index === 0 && (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold)) {
                handleNext();
              }
            }}
            animate={{
              x: out ? (stackDirection === "left" ? '-100%' : '100%') : (stackDirection === "left" ? -index * 8 : index * 8),
              y: out ? '-20%' : 0,
              rotate: out ? (stackDirection === "left" ? -20 : 20) : (stackDirection === "left" ? -index * 2.5 : index * 2.5),
              scale: out ? 1 : 1 - index * 0.03,
              zIndex: out ? cards.length + 1 : cards.length - index,
              opacity: out ? 0 : 1,
            }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
            style={{ transformOrigin: stackDirection === "left" ? "bottom left" : "bottom right" }}
          >
            <StoryImage src={card.src} priority={priority && card.id === 0} eager={priority} />
            
            {/* Dark overlay for back cards to give depth */}
            {!out && index > 0 && (
              <motion.div 
                className="absolute inset-0 bg-black pointer-events-none"
                initial={false}
                animate={{ opacity: index * 0.15 }}
                transition={{ duration: 0.4 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
    
    {/* Indicator below the gallery */}
    {cards.length > 1 && (
      <div 
        className="mt-6 md:mt-8 flex items-center justify-center gap-1.5 text-aurora-black/50 hover:text-aurora-purple transition-colors cursor-pointer"
        onClick={handleNext}
      >
        <MousePointerClick className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
        <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase">Tap / Swipe to switch image</span>
      </div>
    )}
    </>
  );
}

export default function Heritage() {
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const nativeSticky = CSS.supports("overflow", "clip");
    const update = () => {
      frame = 0;
      const wrapper = headingRef.current;
      const heading = wrapper?.firstElementChild as HTMLElement | null;
      if (!wrapper || !heading) return;
      if (window.innerWidth >= 768) {
        heading.style.opacity = "";
        heading.style.transform = "";
        wrapper.closest("section")?.querySelectorAll<HTMLElement>("[data-story-reveal]").forEach((section) => {
          const content = section.firstElementChild as HTMLElement | null;
          if (!content) return;
          content.style.opacity = "";
          content.style.transform = "";
          content.style.pointerEvents = "";
          content.style.top = "";
        });
        return;
      }
      const top = wrapper.getBoundingClientRect().top;
      const progress = Math.max(0, Math.min(1, (window.innerHeight * .95 - top) / (window.innerHeight * .45)));
      heading.style.opacity = String(progress);
      heading.style.transform = `scale(${.8 + progress * .2})`;
      wrapper.closest("section")?.querySelectorAll<HTMLElement>("[data-story-reveal]").forEach((section) => {
        const content = section.firstElementChild as HTMLElement | null;
        if (!content) return;
        const sectionTop = section.getBoundingClientRect().top;
        const sectionProgress = Math.max(0, Math.min(1, (window.innerHeight * .95 - sectionTop) / (window.innerHeight * .8)));
        let offset = 0;
        let fade = 0;
        if (section.hasAttribute("data-story-last") && window.matchMedia("(max-width: 767px)").matches) {
          const travel = Math.max(1, section.offsetHeight - content.offsetHeight);
          const stopAt = Math.min(96, window.innerHeight * .8 - content.offsetHeight);
          const distance = Math.max(0, stopAt - sectionTop);
          if (nativeSticky && content.style.top !== `${stopAt}px`) content.style.top = `${stopAt}px`;
          offset = nativeSticky ? 0 : Math.min(travel, distance);
          const nextHeading = document.querySelector<HTMLElement>("#team h2");
          const fadeStart = travel * .4;
          const fadeEnd = nextHeading ? distance + nextHeading.getBoundingClientRect().top - window.innerHeight * .8 : travel * 1.2;
          fade = Math.max(0, Math.min(1, (distance - fadeStart) / Math.max(1, fadeEnd - fadeStart)));
        }
        content.style.opacity = String(sectionProgress * (1 - fade));
        content.style.transform = `translate3d(0, ${Math.round(offset * 2) / 2}px, 0) scale(${(.85 + sectionProgress * .15) * (1 - fade * .1)})`;
        content.style.pointerEvents = fade > .98 ? "none" : "";
      });
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  const history = [
    {
      year: "2021",
      title: "倔强前行 | 极光初现",
      description:
        "一切始于一个炽热的梦想。当我们的第一辆方程式赛车在工作室发出第一声轰鸣，名为“AURORA”的追风故事就此开篇。我们用汗水与热爱，在从零到一的土地上埋下了第一颗种子。",
      images: [
        storyCoverUrl,
        getStoryImageUrl("2021-2.webp"),
        getStoryImageUrl("2021-3.webp"),
      ],
    },
    {
      year: "2022",
      title: "逆境淬炼 | 浴火而生",
      description:
        "毅然选择了最具挑战的四电机技术路径。零经验、疫情、设计失误如同淬火的熔炉。经历了通宵排障的焦灼，虽然止步于高压检测门前，但正是这次“失败”，淬炼了我们不屈的筋骨。",
      images: [
        getStoryImageUrl("2022-1.webp"),
        getStoryImageUrl("2022-2.webp"),
        getStoryImageUrl("2022-3.webp"),
      ],
    },
    {
      year: "2023",
      title: "破局登台 | 光芒初绽",
      description:
        "坚守，终将迎来破晓。带着全新的E07，我们再次站上赛场，并历史性地通过了车检！耐久赛冲过终点线的那一刻只剩泪水与欢呼——我们不仅完赛，更一举斩获全国季军，首度登上了全国赛的领奖台！",
      images: [
        getStoryImageUrl("2023-1.webp"),
        getStoryImageUrl("2023-2.webp"),
        getStoryImageUrl("2023-3.webp"),
      ],
    },
    {
      year: "2024",
      title: "厚积薄发 | 问鼎巅峰",
      description:
        "荣耀是对深耕最好的加冕。团队在技术与管理上持续沉淀，最终在全国最高舞台上，一举斩获中国大学生电动方程式大赛全国亚军，攀上了队史的新高峰。",
      images: [
        getStoryImageUrl("2024-1.webp"),
        getStoryImageUrl("2024-2.webp"),
        getStoryImageUrl("2024-3.webp"),
      ],
    },
    {
      year: "2025",
      title: "砺新致远 | 奔赴山海",
      description:
        "打造首台单体壳赛车，踏上“一车二赛”征程。我们不仅将“最佳涂装奖”从海外带回，更在国内车检、设计答辩与商业报告中实现重大突破。然而距最高荣誉仅一步之遥时，由于一根线束的隐患，我们遗憾止步于耐久赛，未能实现最终的目标。这份落差让我们更加清醒：要成为真正的强队，技术、协作与细节仍需千锤百炼。",
      images: [
        getStoryImageUrl("2025-1.webp"),
        getStoryImageUrl("2025-2.webp"),
        getStoryImageUrl("2025-3.webp"),
      ],
    },
    {
      year: "2026",
      title: "砺锋再战 | 永逐极光",
      description:
        "二度出征西班牙，极光车队斩获电车组第十名，顺利完赛，实现海外赛事的历史性突破。历经海外赛道的实战检验，车队在单体壳轻量化、电控稳定性、底盘调校完成迭代优化。满载海外赛场的收获与成长，我们重整行装，向着合肥赛场进发，以成熟姿态迎接新的挑战，奔赴属于我们的星海。",
      images: [
        getStoryImageUrl("2026-1.webp"),
        getStoryImageUrl("2026-2.webp"),
        getStoryImageUrl("2026-3.webp"),
      ],
    },
  ];

  return (
    <section
      id="heritage"
      className="w-full bg-white pt-28 pb-12 md:py-24 overflow-clip"
    >
      <div className="max-w-[1600px] mx-auto px-6">
        <div ref={headingRef} className="mb-10 md:mb-20">
        <div className="text-center">
          <h2 className="font-display text-4xl md:text-5xl font-black text-[#6722C1] uppercase tracking-tighter">
            Team Story
          </h2>
          <div className="w-24 h-1 bg-[#6722C1] mx-auto mt-4"></div>
          <p className="mt-6 text-aurora-black/60 max-w-2xl mx-auto font-medium">
            记录 AURORA Racing 从无到有、从起步到腾飞的每一个精彩瞬间。
          </p>
        </div>
        </div>

        <div className="flex flex-col gap-16 md:gap-24">
          {history.map((item, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <div key={item.year} data-story-reveal data-story-last={idx === history.length - 1 ? "" : undefined} className={`mt-8 md:mt-0 ${idx === history.length - 1 ? "story-final-stage" : ""}`}>
              <div
                className={`flex flex-col-reverse ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                } items-center gap-8 md:gap-16`}
              >
                {/* Image */}
                <div className="w-full md:w-1/2 overflow-visible relative">
                  <StackedImageGallery images={item.images} stackDirection={isEven ? "left" : "right"} priority={idx === 0} />
                </div>

                {/* Text */}
                <div className="w-full md:w-1/2 flex flex-col justify-center">
                  <div className="flex items-baseline gap-4 mb-4">
                    <span className="font-display text-5xl md:text-7xl font-black text-aurora-black/10">
                      {item.year}
                    </span>
                    <h3 className="font-display text-2xl md:text-3xl font-bold text-aurora-black">
                      {item.title}
                    </h3>
                  </div>
                  <div className="w-12 h-1 bg-aurora-purple mb-6"></div>
                  <p className="text-aurora-black/70 leading-relaxed text-lg">
                    {item.description}
                  </p>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
