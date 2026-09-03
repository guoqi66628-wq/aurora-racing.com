import { getAssetUrl } from "../utils/cdn";
import { motion } from "motion/react";
import { useState } from "react";
import { MousePointerClick } from "lucide-react";

type CardData = {
  id: number;
  src: string;
  isAnimatingOut?: boolean;
};

function StackedImageGallery({ images, stackDirection = "right" }: { images: string[], stackDirection?: "left" | "right" }) {
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
      className="relative w-4/5 md:w-3/4 mx-auto aspect-[4/3] md:aspect-video cursor-pointer select-none mb-4 md:mb-0 group" 
      onClick={handleNext}
    >
      {cards.map((card, index) => {
        const out = card.isAnimatingOut;
        
        return (
          <motion.div
            key={card.id}
            layout
            className="absolute inset-0 rounded-[1.5rem] overflow-hidden shadow-2xl"
            initial={false}
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
              x: out ? (stackDirection === "left" ? '-100%' : '100%') : (stackDirection === "left" ? -index * 18 : index * 18),
              y: out ? '-20%' : 0,
              rotate: out ? (stackDirection === "left" ? -20 : 20) : (stackDirection === "left" ? -index * 6 : index * 6),
              scale: out ? 1 : 1 - index * 0.05,
              zIndex: out ? cards.length + 1 : cards.length - index,
              opacity: out ? 0 : 1,
            }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
            style={{ transformOrigin: stackDirection === "left" ? "bottom left" : "bottom right" }}
          >
            <img
              src={card.src}
              alt=""
              width="1200"
              height="900"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            
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
  const history = [
    {
      year: "2021",
      title: "草创启程 | 极光初现",
      description:
        "一切始于一个炽热的梦想。当我们的第一辆方程式赛车在工作室发出第一声轰鸣，名为“AURORA”的追风故事就此开篇。我们用汗水与热爱，在从零到一的土地上埋下了第一颗种子。",
      images: [
        getAssetUrl("/images/heritage/2021-1.webp"),
        getAssetUrl("/images/heritage/2021-2.webp"),
        getAssetUrl("/images/heritage/2021-3.webp"),
      ],
    },
    {
      year: "2022",
      title: "逆境淬炼 | 浴火而生",
      description:
        "毅然选择了最具挑战的四电机技术路径。零经验、疫情、设计失误如同淬火的熔炉。经历了通宵排障的焦灼，虽然止步于高压检测门前，但正是这次“失败”，淬炼了我们不屈的筋骨。",
      images: [
        getAssetUrl("/images/heritage/2022-1.webp"),
        getAssetUrl("/images/heritage/2022-2.webp"),
        getAssetUrl("/images/heritage/2022-3.webp"),
      ],
    },
    {
      year: "2023",
      title: "破局登台 | 光芒初绽",
      description:
        "坚守，终将迎来破晓。带着全新的E07，我们再次站上赛场，并历史性地通过了车检！耐久赛冲过终点线的那一刻只剩泪水与欢呼——我们不仅完赛，更一举斩获全国季军，首度登上了全国赛的领奖台！",
      images: [
        getAssetUrl("/images/heritage/2023-1.webp"),
        getAssetUrl("/images/heritage/2023-2.webp"),
        getAssetUrl("/images/heritage/2023-3.webp"),
      ],
    },
    {
      year: "2024",
      title: "厚积薄发 | 问鼎巅峰",
      description:
        "荣耀是对深耕最好的加冕。团队在技术与管理上持续沉淀，最终在全国最高舞台上，一举斩获中国大学生电动方程式大赛全国亚军，攀上了队史的新高峰。",
      images: [
        getAssetUrl("/images/heritage/2024-1.webp"),
        getAssetUrl("/images/heritage/2024-2.webp"),
        getAssetUrl("/images/heritage/2024-3.webp"),
      ],
    },
    {
      year: "2025",
      title: "砺新致远 | 奔赴山海",
      description:
        "打造首台单体壳赛车，踏上“一车二赛”征程。我们不仅将“最佳涂装奖”从海外带回，更在国内车检、设计答辩与商业报告中实现重大突破。然而距最高荣誉仅一步之遥时，由于一根线束的隐患，我们遗憾止步于耐久赛，未能实现最终的目标。这份落差让我们更加清醒：要成为真正的强队，技术、协作与细节仍需千锤百炼。",
      images: [
        getAssetUrl("/images/heritage/2025-1.webp"),
        getAssetUrl("/images/heritage/2025-2.webp"),
        getAssetUrl("/images/heritage/2025-3.webp"),
      ],
    },
    {
      year: "2026",
      title: "砺锋再战 | 永逐极光",
      description:
        "带着去年积累的宝贵经验与刻骨遗憾，重整旗鼓的极光车队将再次出征西班牙并迎战中国赛。我们在单体壳轻量化、电控稳定性与底盘调校等方面进行了系统性提升。这一次，我们拥有了更足的底气与更加坚定的信念，将以更完备的准备与成熟的姿态，直面国内外赛场的严苛考验，全力奔赴我们心中的星海！",
      images: [
        getAssetUrl("/images/heritage/2026-1.webp"),
        getAssetUrl("/images/heritage/2026-2.webp"),
        getAssetUrl("/images/heritage/2026-3.webp"),
      ],
    },
  ];

  return (
    <section
      id="heritage"
      className="w-full bg-aurora-white pt-8 pb-12 md:py-24 overflow-hidden"
    >
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="text-center mb-10 md:mb-20">
          <h2 className="font-display text-4xl md:text-5xl font-black text-aurora-black uppercase tracking-tighter">
            Team <span className="text-aurora-purple">Story</span>
          </h2>
          <div className="w-24 h-1 bg-aurora-purple mx-auto mt-4"></div>
          <p className="mt-6 text-aurora-black/60 max-w-2xl mx-auto font-medium">
            记录 AURORA Racing 从无到有、从起步到腾飞的每一个精彩瞬间。
          </p>
        </div>

        <div className="flex flex-col gap-16 md:gap-24">
          {history.map((item, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`flex flex-col-reverse ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                } items-center gap-8 md:gap-16 mt-8 md:mt-0`}
              >
                {/* Image */}
                <div className="w-full md:w-1/2 overflow-visible relative">
                  <StackedImageGallery images={item.images} stackDirection={isEven ? "left" : "right"} />
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
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
