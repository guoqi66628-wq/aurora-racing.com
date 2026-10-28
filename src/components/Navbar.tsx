import { getAssetUrl } from "../utils/cdn";
import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "motion/react";
import { Menu, X, ChevronDown, ArrowUpRight } from "lucide-react";
import AuroraLogo from "./AuroraLogo";
import { useIsMobile } from "../hooks/useIsMobile";

const NAV_ITEMS: { name: string; target: string; dropdown?: boolean; dropdownType?: 'cars' | 'team' }[] = [
  { name: "HOME", target: "home" },
  { name: "SPONSORS", target: "partners" },
  { name: "CARS", target: "specs", dropdown: true, dropdownType: 'cars' },
  { name: "STORY", target: "heritage" },
  { name: "TEAM", target: "team", dropdown: true, dropdownType: 'team' },
  { name: "CONTACT", target: "contact" },
];

const carYears = [2026, 2025, 2024, 2023, 2022, 2021];
const teamOptions = [
  { name: "Team 2026", value: "team" },
  { name: "Alumni", value: "alumni" },
];

const PERFORMANCE_LAB_URL = "https://lab.aurora-racing.com/";
const TELEMETRY_URL = "https://telemetry.aurora-racing.com/login";

export default function Navbar() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isTop, setIsTop] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCarsHovered, setIsCarsHovered] = useState(false);
  const [isTeamHovered, setIsTeamHovered] = useState(false);
  const [isMobileCarsOpen, setIsMobileCarsOpen] = useState(false);
  const [isMobileTeamOpen, setIsMobileTeamOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const isMobile = useIsMobile();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    const isScrollingUp = latest < previous;
    const isScrollingDown = latest > previous;
    const isAtTop = latest < 50;

    // 在顶部：始终显示，透明背景
    if (isAtTop) {
      setHidden(false);
      setIsTop(true);
    }
    // 不在顶部的情况
    else {
      setIsTop(false);
      // 向上滚动：立即显示导航栏（带玻璃效果）
      // 只要有任何向上滚动的迹象就立即显示
      if (isScrollingUp) {
        setHidden(false);
      }
      // 向下滚动且滚动位置超过100px：隐藏导航栏
      else if (isScrollingDown && latest > 100 && !isMobileMenuOpen) {
        setHidden(true);
      }
    }
  });

  // 桌面路由变化后复位导航状态（移动端锚点跳转不触发路由切换）
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  useEffect(() => {
    if (isMobile) return;
    setHidden(false);
    setIsTop(true);
    setIsMobileMenuOpen(false);
    setIsMobileCarsOpen(false);
    setIsMobileTeamOpen(false);
    setHasAnimated(false);
  }, [hash, isMobile]);

  const scrollToSection = (target: string) => {
    // 等菜单退出动画结束再滚动，避免被折叠动画干扰
    window.setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  };

  const handleNavClick = (target: string) => {
    setIsMobileMenuOpen(false);
    setIsMobileCarsOpen(false);
    if (isMobile) {
      scrollToSection(target);
    } else {
      const route = target === "heritage" ? "#/story" : target === "team" ? "#/team" : target === "specs" ? "#/specs" : "#/";
      window.location.hash = route;
      // 等新页面渲染完成再滚到章节（桌面 App 路由切换时会先滚回顶部）
      window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  };

  const pickYear = (year: number) => {
    sessionStorage.setItem('selectedCarYear', String(year));
    window.dispatchEvent(new CustomEvent('changeCarYear', { detail: year }));
    setIsCarsHovered(false);
    setIsTeamHovered(false);
    setIsMobileMenuOpen(false);
    setIsMobileCarsOpen(false);
    setIsMobileTeamOpen(false);
    // 移动端：同一页，直接滚到车型区
    if (isMobile) {
      scrollToSection("specs");
    } else {
      window.location.hash = "#/specs";
      window.setTimeout(() => {
        document.getElementById("specs")?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  };

  const pickTeamOption = (value: string) => {
    sessionStorage.setItem('selectedTeamView', value);
    window.dispatchEvent(new CustomEvent('changeTeamView', { detail: value }));
    setIsCarsHovered(false);
    setIsTeamHovered(false);
    setIsMobileMenuOpen(false);
    setIsMobileCarsOpen(false);
    setIsMobileTeamOpen(false);
    // 移动端：同一页，直接滚到对应区域
    if (isMobile) {
      // 根据选择的值决定滚动目标
      const targetSection = value === "alumni" ? "alumni" : "team";
      scrollToSection(targetSection);
    } else {
      window.location.hash = "#/team";
      window.setTimeout(() => {
        // 桌面端始终先导航到 team 页面，然后根据值决定滚动目标
        const targetSection = value === "alumni" ? "alumni" : "team";
        document.getElementById(targetSection)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  };

  return (
    <motion.nav
      variants={{
        initial: { y: -100 },
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      initial="initial"
      animate={hasAnimated ? (hidden ? "hidden" : "visible") : "visible"}
      transition={{
        type: "spring",
        stiffness: hasAnimated ? 500 : 260,
        damping: hasAnimated ? 25 : 20,
        mass: hasAnimated ? 0.5 : 0.8,
      }}
      onAnimationComplete={(definition) => {
        if (definition === "visible" && !hasAnimated) {
          setHasAnimated(true);
        }
      }}
      style={{
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
      className={`fixed top-0 left-0 right-0 z-50 ${
        isTop && !isMobileMenuOpen
          ? "nav-glass-transparent"
          : "nav-glass"
      }`}
    >
      <div className="w-full px-6 md:px-6 lg:px-12 h-20 flex items-center justify-between relative z-50">
        {/* Logo */}
        <a
          href={isMobile ? "#home" : "#/"}
          className="flex items-center group -ml-2 sm:-ml-4"
          onClick={(e) => {
            e.preventDefault();
            setIsMobileMenuOpen(false);
            scrollToSection("home");
          }}
        >
          <AuroraLogo className="hidden md:block w-28 lg:w-36 h-auto group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
          <img
            src={getAssetUrl("/images/logos/logo-mobile.webp")}
            alt="Aurora Logo"
            width="1620"
            height="587"
            className="md:hidden w-28 h-auto group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-8">
          {NAV_ITEMS.map((item) => (
            item.dropdown ? (
              <div
                key={item.name}
                className="relative group"
                onMouseEnter={() => item.dropdownType === 'cars' ? setIsCarsHovered(true) : setIsTeamHovered(true)}
                onMouseLeave={() => item.dropdownType === 'cars' ? setIsCarsHovered(false) : setIsTeamHovered(false)}
              >
                <a
                  href={item.target === "specs" ? "#/specs" : "#/team"}
                  onClick={(e) => { e.preventDefault(); handleNavClick(item.target); }}
                  className="text-sm font-medium tracking-widest text-aurora-white/80 hover:text-aurora-purple transition-colors relative flex items-center gap-1 py-4"
                >
                  {item.name}
                  <span className="absolute bottom-3 left-0 w-0 h-0.5 bg-aurora-purple transition-all group-hover:w-full"></span>
                </a>
                {/* Dropdown */}
                <AnimatePresence>
                  {((item.dropdownType === 'cars' && isCarsHovered) || (item.dropdownType === 'team' && isTeamHovered)) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-2 origin-top"
                    >
                      <div className="dropdown-glass rounded-xl py-2 flex flex-col min-w-[120px]">
                        {item.dropdownType === 'cars' ? (
                          carYears.map((year, i) => (
                            <motion.a
                              key={year}
                              href="#/specs"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.015, duration: 0.12 }}
                              onClick={(e) => {
                                e.preventDefault();
                                pickYear(year);
                              }}
                              className="px-4 py-2.5 text-sm font-display text-aurora-white/80 hover:text-aurora-purple hover:bg-aurora-white/10 transition-all duration-150 text-center block font-bold drop-shadow-md"
                            >
                              {year}
                            </motion.a>
                          ))
                        ) : (
                          teamOptions.map((option, i) => (
                            <motion.a
                              key={option.value}
                              href="#/team"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.015, duration: 0.12 }}
                              onClick={(e) => {
                                e.preventDefault();
                                pickTeamOption(option.value);
                              }}
                              className="px-4 py-2.5 text-sm font-display text-aurora-white/80 hover:text-aurora-purple hover:bg-aurora-white/10 transition-all duration-150 text-center block font-bold drop-shadow-md"
                            >
                              {option.name}
                            </motion.a>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                key={item.name}
                href={isMobile ? `#${item.target}` : item.target === "heritage" ? "#/story" : item.target === "team" ? "#/team" : item.target === "specs" ? "#/specs" : "#/"}
                onClick={(e) => { e.preventDefault(); handleNavClick(item.target); }}
                className="text-sm font-medium tracking-widest text-aurora-white/80 hover:text-aurora-purple transition-colors relative group py-4"
              >
                {item.name}
                <span className="absolute bottom-3 left-0 w-0 h-0.5 bg-aurora-purple transition-all group-hover:w-full"></span>
              </a>
            )
          ))}
          <a
            href={PERFORMANCE_LAB_URL}
            className="text-sm font-medium tracking-widest text-aurora-white/80 hover:text-aurora-purple transition-colors relative group py-4"
          >
            LAB
            <span className="absolute bottom-3 left-0 w-0 h-0.5 bg-aurora-purple transition-all group-hover:w-full"></span>
          </a>
          <a
            href={TELEMETRY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TELEMETRY 数据分析工作台（在新标签页打开）"
            className="telemetry-nav-link shrink-0 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-3 lg:px-4 py-2.5 text-xs lg:text-sm font-medium tracking-widest text-aurora-white transition-colors hover:border-purple-400/70 hover:bg-aurora-purple/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-300"
          >
            <span>TELEMETRY</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="lg:hidden flex items-center">
          <button
            className="text-aurora-white p-2 hover:text-aurora-purple transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Simple backdrop without blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/5 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Dropdown Menu - aligned to hamburger button */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full right-6 lg:hidden flex flex-col z-50 mt-2 origin-top-right w-[220px] max-h-[calc(100dvh-6rem)] overflow-y-auto!"
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(40px) saturate(180%) brightness(1.1)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%) brightness(1.1)',
                borderRadius: '24px',
                padding: '1.25rem 1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset',
              }}
            >
              <div className="flex flex-col">
                {NAV_ITEMS.map((item, idx) => (
                  item.dropdown ? (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.2 }}
                      className="flex flex-col"
                    >
                      <div className="flex items-center justify-between">
                        <a href={`#${item.target}`} onClick={(e) => { e.preventDefault(); handleNavClick(item.target); }} className="py-2.5 text-lg font-medium tracking-widest text-aurora-white/90 hover:text-aurora-purple transition-colors flex-1">
                          {item.name}
                        </a>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.dropdownType === 'cars') {
                              setIsMobileCarsOpen(!isMobileCarsOpen);
                              setIsMobileTeamOpen(false);
                            } else {
                              setIsMobileTeamOpen(!isMobileTeamOpen);
                              setIsMobileCarsOpen(false);
                            }
                          }}
                          className="p-1.5 text-aurora-white/70 hover:text-aurora-purple outline-none"
                          aria-label={
                            item.dropdownType === 'cars'
                              ? (isMobileCarsOpen ? "Collapse car years" : "Expand car years")
                              : (isMobileTeamOpen ? "Collapse team options" : "Expand team options")
                          }
                          aria-expanded={item.dropdownType === 'cars' ? isMobileCarsOpen : isMobileTeamOpen}
                        >
                          <ChevronDown size={18} className={`transition-transform duration-300 ${
                            (item.dropdownType === 'cars' && isMobileCarsOpen) || (item.dropdownType === 'team' && isMobileTeamOpen)
                              ? "rotate-180"
                              : ""
                          }`} />
                        </button>
                      </div>
                      <AnimatePresence>
                        {((item.dropdownType === 'cars' && isMobileCarsOpen) || (item.dropdownType === 'team' && isMobileTeamOpen)) && (
                          <motion.div
                            initial={{ maxHeight: 0, opacity: 0 }}
                            animate={{ maxHeight: 400, opacity: 1 }}
                            exit={{ maxHeight: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden pb-2 pt-1"
                          >
                            <div className="flex flex-col pl-4">
                              {item.dropdownType === 'cars' ? (
                                carYears.map((year, i) => (
                                  <motion.a
                                    key={year}
                                    href="#specs"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04, duration: 0.2 }}
                                    onClick={(e) => { e.preventDefault(); pickYear(year); }}
                                    className="py-2 text-base font-display font-bold text-aurora-white/70 hover:text-aurora-purple transition-colors"
                                  >
                                    {year}
                                  </motion.a>
                                ))
                              ) : (
                                teamOptions.map((option, i) => (
                                  <motion.a
                                    key={option.value}
                                    href="#team"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04, duration: 0.2 }}
                                    onClick={(e) => { e.preventDefault(); pickTeamOption(option.value); }}
                                    className="py-2 text-base font-display font-bold text-aurora-white/70 hover:text-aurora-purple transition-colors"
                                  >
                                    {option.name}
                                  </motion.a>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.a
                      key={item.name}
                      href={`#${item.target}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.2 }}
                      onClick={(e) => { e.preventDefault(); handleNavClick(item.target); }}
                      className="py-2.5 text-lg font-medium tracking-widest text-aurora-white/90 hover:text-aurora-purple transition-colors"
                    >
                      {item.name}
                    </motion.a>
                  )
                ))}
                <a
                  href={PERFORMANCE_LAB_URL}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2.5 text-lg font-medium tracking-widest text-aurora-white/90 hover:text-aurora-purple transition-colors"
                >
                  LAB
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
