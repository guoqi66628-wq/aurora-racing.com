import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function Partners() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Individual naming for sponsor logos to facilitate easy replacement
  const specialStrategicSponsors = Array.from({ length: 2 }, (_, i) => `/images/partners/strategic-${i + 1}.webp`);
  const topSponsors = Array.from({ length: 3 }, (_, i) => `/images/partners/top-${i + 1}.webp`);
  
  const remainingTopSponsors = Array.from({ length: 4 }, (_, i) => `/images/partners/top-rem-${i + 1}.webp`);

  const sponsorTiers = [
    {
      name: "紧密合作伙伴",
      color: "text-slate-700",
      sponsors: Array.from({ length: 10 }, (_, i) => `/images/partners/tier1-${i + 1}.webp`),
      gridClass: "grid-cols-3 sm:grid-cols-3 md:grid-cols-5 px-4 md:px-0",
    },
    {
      name: "合作伙伴",
      color: "text-slate-600",
      sponsors: Array.from({ length: 13 }, (_, i) => `/images/partners/tier2-${i + 1}.webp`),
      gridClass: "grid-cols-3 sm:grid-cols-3 md:grid-cols-5 px-4 md:px-0",
    }
  ];

  return (
    <section
      id="partners"
      className="w-full bg-aurora-white py-12 md:py-24 overflow-hidden relative"
    >
      <div className="max-w-[1600px] mx-auto px-6 mb-12 text-center relative z-10">
        <h2 className="font-display text-4xl md:text-5xl font-black text-aurora-black uppercase tracking-tighter">
          Our <span className="text-aurora-purple">Sponsors</span>
        </h2>
        <div className="w-24 h-1 bg-aurora-purple mx-auto mt-4"></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 relative z-10">
        <h3 className="text-lg md:text-xl font-bold tracking-widest mb-8 md:mb-10 text-center text-slate-800">
          特约战略合作伙伴
        </h3>

        {/* Special Strategic Sponsors Display */}
        <div className="flex flex-row justify-center items-center gap-6 sm:gap-12 md:gap-24 lg:gap-32 mb-16 w-full max-w-5xl mx-auto flex-nowrap">
          {specialStrategicSponsors.map((src, idx) => (
            <motion.img
              key={`special-sponsor-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              src={src}
              alt={`Special Strategic Sponsor ${idx + 1}`}
              className="w-auto max-w-[140px] sm:max-w-[200px] h-12 sm:h-20 md:h-24 object-contain hover:scale-110 transition-all duration-300"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>

        <h3 className="text-base md:text-lg font-bold tracking-widest mb-8 md:mb-10 text-center text-slate-700">
          战略合作伙伴
        </h3>

        {/* Initial Top Sponsors Display */}
        <div className="grid grid-cols-3 sm:flex sm:flex-row justify-center justify-items-center items-center gap-6 sm:gap-8 md:gap-16 lg:gap-24 mb-8 w-full max-w-5xl mx-auto px-4 sm:px-0">
          {topSponsors.map((src, idx) => (
            <motion.img
              key={`top-sponsor-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 + 0.2 }}
              src={src}
              alt={`Top Sponsor ${idx + 1}`}
              className="w-auto max-w-[80px] sm:max-w-[160px] h-8 sm:h-16 md:h-20 object-contain hover:scale-110 transition-all duration-300"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>

        {/* Expanded Sponsors Panel with Jelly Effect */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95, y: -20 }}
              animate={{ 
                opacity: 1, 
                height: "auto", 
                scale: 1, 
                y: 0,
                transition: { 
                  type: "spring", 
                  bounce: 0.5, 
                  damping: 12, 
                  stiffness: 100,
                  mass: 0.8
                } 
              }}
              exit={{ 
                opacity: 0, 
                height: 0, 
                scale: 0.95, 
                y: -20,
                transition: { duration: 0.3, ease: "easeInOut" }
              }}
              className="overflow-hidden"
            >
              <div className="pb-12">
                <div className="flex flex-col gap-16 md:gap-24">
                  {/* Remaining 4 Top Sponsors */}
                  <div className="flex flex-col items-center">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 justify-items-center justify-center items-center gap-6 sm:gap-8 md:gap-16 lg:gap-24 w-full max-w-5xl mx-auto px-4 sm:px-0">
                      {remainingTopSponsors.map((src, idx) => (
                        <motion.img
                          key={`rem-sponsor-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + (idx * 0.05), duration: 0.4, ease: "easeOut" }}
                          src={src}
                          alt={`Top Sponsor ${idx + 4}`}
                          className="w-auto max-w-[80px] sm:max-w-[160px] h-8 sm:h-16 md:h-20 object-contain hover:scale-110 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                  </div>

                  {sponsorTiers.map((tier, tierIdx) => (
                    <div key={tier.name} className="flex flex-col items-center">
                      <h3 className={`text-base md:text-lg font-bold tracking-widest mb-8 md:mb-10 text-center ${tier.color}`}>
                        {tier.name}
                      </h3>
                      <div className={`grid ${tier.gridClass} justify-items-center justify-center items-center gap-6 sm:gap-10 md:gap-16 w-full max-w-6xl mx-auto`}>
                        {tier.sponsors.map((src, idx) => (
                          <motion.img
                            key={`tier-${tierIdx}-sponsor-${idx}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + (idx * 0.05), duration: 0.4, ease: "easeOut" }}
                            src={src}
                            alt={`${tier.name} Sponsor ${idx + 1}`}
                            className="w-auto max-w-[60px] sm:max-w-[120px] h-5 sm:h-12 md:h-14 object-contain hover:scale-110 transition-all duration-300"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expand/Collapse Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex flex-col items-center gap-2 text-aurora-black/50 hover:text-aurora-purple transition-colors group"
          >
            <span className="text-sm font-bold tracking-widest uppercase">
              {isExpanded ? "Hide All Sponsors" : "View All Sponsors"}
            </span>
            <motion.div
              animate={{ y: isExpanded ? 0 : [0, 5, 0] }}
              transition={{ repeat: isExpanded ? 0 : Infinity, duration: 1.5 }}
              className="w-10 h-10 rounded-full bg-aurora-black/5 flex items-center justify-center group-hover:bg-aurora-purple/10"
            >
              {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </motion.div>
          </button>
        </div>
      </div>
    </section>
  );
}
