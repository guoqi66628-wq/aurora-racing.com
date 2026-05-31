import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "motion/react";
import { Menu, X, ChevronDown } from "lucide-react";
import AuroraLogo from "./AuroraLogo";

export default function Navbar() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isTop, setIsTop] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCarsHovered, setIsCarsHovered] = useState(false);
  const [isMobileCarsOpen, setIsMobileCarsOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150 && !isMobileMenuOpen) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    setIsTop(latest < 50);
  });

  const navLinks = [
    { name: "HOME", href: "#home" },
    { name: "SPONSORS", href: "#partners" },
    { name: "CARS", href: "#specs" },
    { name: "STORY", href: "#heritage" },
    { name: "TEAM", href: "#team" },
    { name: "CONTACT", href: "#contact" },
  ];

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        isTop && !isMobileMenuOpen
          ? "bg-transparent border-transparent"
          : "bg-aurora-black/40 backdrop-blur-xl border-aurora-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
      }`}
    >
      <div className="w-full px-6 md:px-12 h-20 flex items-center justify-between relative z-50">
        {/* Logo */}
        <a href="#home" className="flex items-center group -ml-2 sm:-ml-4" onClick={() => setIsMobileMenuOpen(false)}>
          <AuroraLogo className="hidden md:block w-36 h-auto group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
          <img 
            src="/images/logos/logo-mobile.png" 
            alt="Aurora Logo" 
            className="md:hidden w-28 h-auto group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
            referrerPolicy="no-referrer"
          />
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            link.name === "CARS" ? (
              <div 
                key={link.name} 
                className="relative group"
                onMouseEnter={() => setIsCarsHovered(true)}
                onMouseLeave={() => setIsCarsHovered(false)}
              >
                <a
                  href={link.href}
                  className="text-sm font-medium tracking-widest text-aurora-white/80 hover:text-aurora-purple transition-colors relative flex items-center gap-1 py-4"
                >
                  {link.name}
                  <span className="absolute bottom-3 left-0 w-0 h-0.5 bg-aurora-purple transition-all group-hover:w-full"></span>
                </a>
                {/* Dropdown */}
                <AnimatePresence>
                  {isCarsHovered && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-2 origin-top"
                    >
                      <div className="bg-aurora-black/40 backdrop-blur-md border border-aurora-white/10 rounded-xl py-2 flex flex-col shadow-2xl min-w-[120px] overflow-hidden">
                        {[2026, 2025, 2024, 2023, 2022, 2021].map((year, i) => (
                          <motion.a
                            key={year}
                            href="#specs"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('changeCarYear', { detail: year }));
                              setIsCarsHovered(false);
                            }}
                            className="px-4 py-2.5 text-sm font-mono text-aurora-white/80 hover:text-aurora-purple hover:bg-aurora-white/10 transition-colors text-center block font-bold drop-shadow-md"
                          >
                            {year}
                          </motion.a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium tracking-widest text-aurora-white/80 hover:text-aurora-purple transition-colors relative group py-4"
              >
                {link.name}
                <span className="absolute bottom-3 left-0 w-0 h-0.5 bg-aurora-purple transition-all group-hover:w-full"></span>
              </a>
            )
          ))}
        </div>

        {/* Mobile Nav Toggle */}
        <div className="md:hidden flex items-center">
          <button 
            className="text-aurora-white p-2 hover:text-aurora-purple transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-6 mt-2 w-64 bg-aurora-black/95 backdrop-blur-xl border border-aurora-white/10 rounded-2xl md:hidden flex flex-col py-2 px-4 shadow-2xl origin-top-right"
          >
            {navLinks.map((link, idx) => (
              link.name === "CARS" ? (
                <div key={link.name} className="flex flex-col border-b border-aurora-white/5 last:border-none">
                  <div className="flex items-center justify-start">
                    <a href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-2 text-base font-medium tracking-widest text-aurora-white/80 hover:text-aurora-purple transition-colors">
                      {link.name}
                    </a>
                    <button 
                      onClick={(e) => { e.preventDefault(); setIsMobileCarsOpen(!isMobileCarsOpen); }}
                      className="p-2 text-aurora-white/60 hover:text-aurora-purple outline-none"
                    >
                      <ChevronDown size={20} className={`transition-transform duration-300 ${isMobileCarsOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {isMobileCarsOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden flex flex-col pl-4 pb-2"
                      >
                        {[2026, 2025, 2024, 2023, 2022, 2021].map(year => (
                          <a
                            key={year}
                            href="#specs"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('changeCarYear', { detail: year }));
                              setIsMobileMenuOpen(false);
                            }}
                            className="py-2 px-2 text-sm font-mono text-aurora-white/60 hover:text-aurora-purple transition-colors"
                          >
                            {year}
                          </a>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.a
                  key={link.name}
                  href={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-3 px-2 text-base font-medium tracking-widest text-aurora-white/80 hover:text-aurora-purple border-b border-aurora-white/5 last:border-none transition-colors"
                >
                  {link.name}
                </motion.a>
              )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
