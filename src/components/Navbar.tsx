import { getAssetUrl } from "../utils/cdn";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence, useReducedMotion } from "motion/react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile";
import { useLiquidGlass } from "../hooks/useLiquidGlass";
import { useMousePositionVar } from "../hooks/useMousePosition";
import { preloadStoryCover } from "../utils/heritageImages";

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
  const [isCarsOpen, setIsCarsOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isMobileCarsOpen, setIsMobileCarsOpen] = useState(false);
  const [isMobileTeamOpen, setIsMobileTeamOpen] = useState(false);
  const isMobile = useIsMobile();
  const isCompact = useIsMobile(1024);
  const reduceMotion = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const hoverSliderRef = useRef<HTMLDivElement>(null);
  const sliderReturnRef = useRef<Animation | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useLiquidGlass(glassRef, "navigation");
  useMousePositionVar(navRef, !isMobile);

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
      else if (isScrollingDown && latest > 100 && !isMobileMenuOpen && !isCarsOpen && !isTeamOpen) {
        setHidden(true);
      }
    }
  });

  // 桌面路由变化后复位导航状态（移动端锚点跳转不触发路由切换）
  const [hash, setHash] = useState(window.location.hash);
  const [homeSection, setHomeSection] = useState<"home" | "partners">("home");
  const activeTarget = hash.startsWith("#/specs") ? "specs"
    : hash.startsWith("#/story") ? "heritage"
    : hash.startsWith("#/team") ? "team" : homeSection;
  const isLight = activeTarget !== "specs";
  useEffect(() => {
    return () => {
      sliderReturnRef.current?.cancel();
      sliderReturnRef.current = null;
      const desktopNav = navRef.current?.querySelector<HTMLElement>(".nav-desktop");
      if (desktopNav) delete desktopNav.dataset.hovering;
      if (hoverSliderRef.current) hoverSliderRef.current.style.opacity = "0";
    };
  }, [activeTarget]);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  useEffect(() => {
    const updateHomeSection = () => {
      const partners = document.getElementById("partners");
      setHomeSection(partners && partners.getBoundingClientRect().top <= window.innerHeight / 2 ? "partners" : "home");
    };
    updateHomeSection();
    window.addEventListener("scroll", updateHomeSection, { passive: true });
    window.addEventListener("resize", updateHomeSection);
    return () => {
      window.removeEventListener("scroll", updateHomeSection);
      window.removeEventListener("resize", updateHomeSection);
    };
  }, [hash, isMobile]);
  useEffect(() => {
    if (isMobile) return;
    setHidden(false);
    setIsTop(true);
    setIsMobileMenuOpen(false);
    setIsMobileCarsOpen(false);
    setIsMobileTeamOpen(false);
    setIsCarsOpen(false);
    setIsTeamOpen(false);
  }, [hash, isMobile]);

  useEffect(() => {
    if (!isCompact) setIsMobileMenuOpen(false);
  }, [isCompact]);

  useEffect(() => {
    if (isCarsOpen || isTeamOpen) return;
    const desktopNav = navRef.current?.querySelector<HTMLElement>(".nav-desktop");
    if (desktopNav) delete desktopNav.dataset.menuHovering;
  }, [isCarsOpen, isTeamOpen]);

  useEffect(() => {
    const closeMenus = () => {
      setIsMobileMenuOpen(false);
      setIsMobileCarsOpen(false);
      setIsMobileTeamOpen(false);
      setIsCarsOpen(false);
      setIsTeamOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!navRef.current?.contains(event.target)) {
        closeMenus();
      } else if (event.target instanceof Element && !event.target.closest('.nav-dropdown-group[data-open="true"]')) {
        setIsCarsOpen(false);
        setIsTeamOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isMobileMenuOpen) toggleRef.current?.focus();
      else navRef.current?.querySelector<HTMLButtonElement>('.nav-desktop button[aria-expanded="true"]')?.focus();
      closeMenus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = (target: string) => {
    // 等菜单退出动画结束再滚动，避免被折叠动画干扰
    window.setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  };

  const handleNavClick = (target: string) => {
    setIsMobileMenuOpen(false);
    setIsMobileCarsOpen(false);
    setIsMobileTeamOpen(false);
    setIsCarsOpen(false);
    setIsTeamOpen(false);
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
    setIsCarsOpen(false);
    setIsTeamOpen(false);
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
    setIsCarsOpen(false);
    setIsTeamOpen(false);
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

  const returnSlider = (desktopNav: HTMLDivElement) => {
    const slider = hoverSliderRef.current;
    if (!slider || desktopNav.dataset.hovering !== "true" || sliderReturnRef.current) return;

    const current = desktopNav.querySelector<HTMLElement>(
      '.nav-dropdown-trigger[data-current="true"], :scope > .nav-pill-link[aria-current="page"]',
    );
    const finish = () => {
      slider.style.transition = "none";
      slider.style.opacity = "0";
      delete desktopNav.dataset.hovering;
      sliderReturnRef.current?.cancel();
      sliderReturnRef.current = null;
      slider.getBoundingClientRect();
      slider.style.removeProperty("transition");
    };
    if (!current || reduceMotion) {
      finish();
      return;
    }

    const navRect = desktopNav.getBoundingClientRect();
    const currentRect = current.getBoundingClientRect();
    const scale = navRect.width / desktopNav.offsetWidth;
    const computed = getComputedStyle(slider);
    const startX = new DOMMatrixReadOnly(computed.transform).m41;
    const endX = (currentRect.left - navRect.left) / scale;
    const endWidth = currentRect.width / scale;
    const endHeight = currentRect.height / scale;
    const endTop = (currentRect.top - navRect.top) / scale;
    const animation = slider.animate([
      { transform: `translate3d(${startX}px, 0, 0)`, width: computed.width, height: computed.height, top: computed.top, offset: 0, easing: "cubic-bezier(0.32, 0.12, 0.5, 1)" },
      { transform: `translate3d(${endX + (endX - startX) * 0.08}px, 0, 0)`, width: `${endWidth}px`, height: `${endHeight}px`, top: `${endTop}px`, offset: 0.74, easing: "ease-in-out" },
      { transform: `translate3d(${endX - (endX - startX) * 0.02}px, 0, 0)`, width: `${endWidth}px`, height: `${endHeight}px`, top: `${endTop}px`, offset: 0.9, easing: "ease-out" },
      { transform: `translate3d(${endX}px, 0, 0)`, width: `${endWidth}px`, height: `${endHeight}px`, top: `${endTop}px`, offset: 1 },
    ], { duration: 1000, easing: "linear", fill: "forwards" });
    sliderReturnRef.current = animation;
    animation.onfinish = finish;
  };

  return (
    <motion.nav
      ref={navRef}
      aria-label="Primary navigation"
      onFocusCapture={() => setHidden(false)}
      data-tone={isLight ? "light" : "dark"}
      data-scrolled={!isTop}
      variants={{
        initial: { y: -100 },
        visible: { y: 0 },
        hidden: { y: "calc(-100% - 32px)" },
      }}
      initial={reduceMotion ? false : "initial"}
      animate={hidden ? "hidden" : "visible"}
      transition={reduceMotion ? { duration: 0 } : {
        type: "spring",
        stiffness: 400,
        damping: 28,
        mass: 0.6,
      }}
      style={{
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
      className="nav-capsule fixed z-50"
    >
      <div ref={glassRef} className="nav-capsule-glass" aria-hidden="true" />
      <div className="nav-capsule-content flex items-center justify-between relative z-10">
        {/* Logo */}
        <a
          href={isMobile ? "#home" : "#/"}
          className="nav-brand flex items-center shrink-0"
          aria-label="Aurora Racing home"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick("home");
          }}
        >
          <img
            src={getAssetUrl(isLight ? "/images/logos/logo-mobile.webp" : "/images/logos/logo-desktop.webp")}
            alt="AURORA Racing Logo"
            width="1620"
            height={isLight ? 587 : 529}
            className="nav-logo w-24 md:w-28 h-auto"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </a>

        {/* Desktop Nav */}
        <div
          className="nav-desktop hidden lg:flex items-center"
          onPointerMove={(event) => {
            if (event.pointerType !== "mouse") return;
            const slider = hoverSliderRef.current;
            if (!slider) return;
            const containerRect = event.currentTarget.getBoundingClientRect();
            if (event.clientY < containerRect.top || event.clientY > containerRect.bottom) {
              returnSlider(event.currentTarget);
              return;
            }
            if (sliderReturnRef.current) {
              const computed = getComputedStyle(slider);
              const transform = computed.transform;
              const width = computed.width;
              const height = computed.height;
              const top = computed.top;
              slider.style.transition = "none";
              sliderReturnRef.current.cancel();
              sliderReturnRef.current = null;
              Object.assign(slider.style, { transform, width, height, top });
              slider.getBoundingClientRect();
              slider.style.removeProperty("transition");
            }
            const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".nav-pill-link") : null;
            const scale = containerRect.width / event.currentTarget.offsetWidth;
            if (target && event.currentTarget.contains(target)) {
              const targetRect = target.getBoundingClientRect();
              slider.style.width = `${targetRect.width / scale}px`;
              slider.style.height = `${targetRect.height / scale}px`;
              slider.style.top = `${(targetRect.top - containerRect.top) / scale}px`;
            }
            const width = parseFloat(slider.style.width);
            if (!width) return;
            event.currentTarget.dataset.hovering = "true";
            const x = Math.max(0, Math.min((event.clientX - containerRect.left) / scale - width / 2, event.currentTarget.offsetWidth - width));
            const isEntering = slider.style.opacity !== "1";
            if (isEntering) slider.style.transition = "none";
            slider.style.transform = `translate3d(${x}px, 0, 0)`;
            if (isEntering) {
              slider.getBoundingClientRect();
              slider.style.removeProperty("transition");
            }
            slider.style.opacity = "1";
          }}
          onPointerLeave={(event) => {
            returnSlider(event.currentTarget);
          }}
        >
          <div
            ref={hoverSliderRef}
            className="nav-hover-slider"
            aria-hidden="true"
          />
          {NAV_ITEMS.map((item) => (
            item.dropdown ? (
              <div
                key={item.name}
                className="nav-dropdown-group relative group"
                data-open={item.dropdownType === 'cars' ? isCarsOpen : isTeamOpen}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsCarsOpen(false);
                    setIsTeamOpen(false);
                  }
                }}
              >
                <div
                  className="nav-pill-link nav-dropdown-trigger"
                  data-current={activeTarget === item.target}
                  data-open={item.dropdownType === 'cars' ? isCarsOpen : isTeamOpen}
                >
                  <a
                    href={item.target === "specs" ? "#/specs" : "#/team"}
                    onClick={(e) => { e.preventDefault(); handleNavClick(item.target); }}
                    className="nav-dropdown-label"
                    aria-current={activeTarget === item.target ? "page" : undefined}
                  >
                    {item.name}
                  </a>
                  <button
                    type="button"
                    className="nav-dropdown-toggle"
                    data-menu-toggle={item.dropdownType}
                    aria-label={`${(item.dropdownType === 'cars' ? isCarsOpen : isTeamOpen) ? 'Close' : 'Open'} ${item.name} menu`}
                    aria-expanded={item.dropdownType === 'cars' ? isCarsOpen : isTeamOpen}
                    aria-controls={`nav-${item.dropdownType}-options`}
                    onClick={() => {
                      if (item.dropdownType === 'cars') {
                        setIsCarsOpen((open) => !open);
                        setIsTeamOpen(false);
                      } else {
                        setIsTeamOpen((open) => !open);
                        setIsCarsOpen(false);
                      }
                    }}
                  >
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                </div>
                {/* Dropdown */}
                <AnimatePresence>
                  {((item.dropdownType === 'cars' && isCarsOpen) || (item.dropdownType === 'team' && isTeamOpen)) && (
                    <motion.div
                      onPointerEnter={(event) => {
                        const desktopNav = event.currentTarget.closest<HTMLElement>(".nav-desktop");
                        if (desktopNav && event.pointerType === "mouse") desktopNav.dataset.menuHovering = "true";
                      }}
                      onPointerLeave={(event) => {
                        const desktopNav = event.currentTarget.closest<HTMLElement>(".nav-desktop");
                        if (desktopNav) delete desktopNav.dataset.menuHovering;
                      }}
                      initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-3 origin-top"
                    >
                      <div id={`nav-${item.dropdownType}-options`} className="nav-dropdown-glass rounded-3xl p-2 flex flex-col min-w-[148px]">
                        {item.dropdownType === 'cars' ? (
                          carYears.map((year, i) => (
                            <motion.a
                              key={year}
                              href="#/specs"
                              initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: reduceMotion ? 0 : i * 0.015, duration: reduceMotion ? 0 : 0.12 }}
                              onClick={(e) => {
                                e.preventDefault();
                                pickYear(year);
                              }}
                              className="nav-dropdown-link"
                            >
                              {year}
                            </motion.a>
                          ))
                        ) : (
                          teamOptions.map((option, i) => (
                            <motion.a
                              key={option.value}
                              href="#/team"
                              initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: reduceMotion ? 0 : i * 0.015, duration: reduceMotion ? 0 : 0.12 }}
                              onClick={(e) => {
                                e.preventDefault();
                                pickTeamOption(option.value);
                              }}
                              className="nav-dropdown-link"
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
                onPointerEnter={item.target === "heritage" ? preloadStoryCover : undefined}
                onFocus={item.target === "heritage" ? preloadStoryCover : undefined}
                onClick={(e) => { e.preventDefault(); handleNavClick(item.target); }}
                className="nav-pill-link"
                aria-current={activeTarget === item.target ? "page" : undefined}
              >
                {item.name}
              </a>
            )
          ))}
          <a
            href={PERFORMANCE_LAB_URL}
            className="nav-pill-link"
          >
            LAB
          </a>
          <a
            href={TELEMETRY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TELEMETRY 数据分析工作台（在新标签页打开）"
            className="nav-pill-link telemetry-nav-link"
          >
            TELEMETRY
          </a>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="lg:hidden flex items-center">
          <button
            ref={toggleRef}
            className="nav-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="nav-compact-menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Dropdown Menu - aligned to hamburger button */}
            <motion.div
              id="nav-compact-menu"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="nav-compact-glass absolute top-full right-0 lg:hidden flex flex-col z-50 mt-3 origin-top-right w-[clamp(150px,42vw,230px)] max-w-full max-h-[calc(100dvh-7rem)] overflow-y-auto!"
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
                        <a href={`#${item.target}`} onClick={(e) => { e.preventDefault(); handleNavClick(item.target); }} className="nav-compact-link py-2.5 text-lg font-medium tracking-widest text-aurora-white/90 flex-1">
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
                          className="nav-compact-toggle w-11 h-11 flex items-center justify-center rounded-full text-aurora-white/70 outline-none"
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
                                    className="nav-compact-link nav-compact-sublink py-2 text-base font-display font-bold text-aurora-white/70"
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
                                    className="nav-compact-link nav-compact-sublink py-2 text-base font-display font-bold text-aurora-white/70"
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
                      className="nav-compact-link py-2.5 text-lg font-medium tracking-widest text-aurora-white/90"
                    >
                      {item.name}
                    </motion.a>
                  )
                ))}
                <a
                  href={PERFORMANCE_LAB_URL}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="nav-compact-link py-2.5 text-lg font-medium tracking-widest text-aurora-white/90"
                >
                  LAB
                </a>
                <a
                  href={TELEMETRY_URL}
                  onClick={() => setIsMobileMenuOpen(false)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-compact-link py-2.5 text-lg font-medium tracking-widest text-aurora-white/90"
                >
                  TELEMETRY
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
