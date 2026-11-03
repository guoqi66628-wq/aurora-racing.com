import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { getAssetUrl } from "../utils/cdn";
import "./SponsorshipBrochure.css";

const slides = [
  { page: 1, title: "赞助手册封面" },
  { page: 4, title: "车队介绍" },
  { page: 5, title: "赛事荣誉" },
  { page: 6, title: "极光电动方程式赛车" },
  { page: 8, title: "综合影响力" },
  { page: 11, title: "新媒体传播" },
  { page: 13, title: "赞助方案" },
];

export default function SponsorshipBrochure() {
  const [active, setActive] = useState(0);
  const [trackIndex, setTrackIndex] = useState(2);
  const [resetting, setResetting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const dragDistance = useRef(0);
  const cardStep = useRef(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const goTo = (index: number) => {
    const next = ((index % slides.length) + slides.length) % slides.length;
    const crossingForward = active === slides.length - 1 && next === 0;
    const crossingBackward = active === 0 && next === slides.length - 1;
    setResetting(false);
    setTrackIndex(crossingForward ? slides.length + 2 : crossingBackward ? 1 : next + 2);
    setActive(next);
  };
  const dragFraction = Math.min(Math.abs(drag) / cardStep.current, 1);
  const dragTarget = (active + (drag < 0 ? 1 : -1) + slides.length) % slides.length;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => goTo(active + 1), 5000);
    return () => window.clearTimeout(timer);
  }, [playing, active]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const nativeSticky = CSS.supports("overflow", "clip");
    let frame = 0;
    let lastTransform = "";
    let lastOpacity = "";
    let needsMeasure = true;
    let stageTop = 0;
    let travel = 1;
    let stopAt = 0;
    let fadeEnd = 1;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    const update = () => {
      frame = 0;
      const stage = stageRef.current;
      const content = stickyRef.current;
      if (!stage || !content) return;
      if (!media.matches) { content.style.opacity = ""; content.style.transform = ""; content.style.pointerEvents = ""; lastTransform = ""; lastOpacity = ""; return; }
      if (needsMeasure) {
        const scrollY = window.scrollY;
        stageTop = stage.getBoundingClientRect().top + scrollY;
        travel = Math.max(1, stage.offsetHeight - content.offsetHeight);
        stopAt = Math.min(96, viewportHeight * .12);
        const nextCard = document.querySelector<HTMLElement>("#specs [data-car-card]");
        fadeEnd = nextCard
          ? stopAt - stageTop + nextCard.getBoundingClientRect().top + scrollY - viewportHeight * .8
          : travel * 1.2;
        needsMeasure = false;
      }
      const scrollDistance = Math.max(0, window.scrollY + stopAt - stageTop);
      const scrollProgress = scrollDistance / travel;
      const progress = Math.min(1, scrollProgress);
      const fadeStart = travel * .4;
      const fade = Math.min(1, Math.max(0, (scrollDistance - fadeStart) / Math.max(1, fadeEnd - fadeStart)));
      const offset = nativeSticky ? 0 : progress * travel;
      const scale = (1 - fade * .1).toFixed(4);
      const opacity = (1 - fade).toFixed(3);
      const transform = `translate3d(0, ${offset}px, 0) scale(${scale})`;
      if (transform !== lastTransform) { content.style.transform = transform; lastTransform = transform; }
      if (opacity !== lastOpacity) { content.style.opacity = opacity; lastOpacity = opacity; }
      content.style.pointerEvents = fade > .98 ? "none" : "";
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    const remeasure = () => { needsMeasure = true; schedule(); };
    const resize = () => {
      if (window.innerWidth !== viewportWidth) {
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        remeasure();
      } else schedule();
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(remeasure);
    if (observer) {
      [stageRef.current, stickyRef.current, document.getElementById("partners"), document.getElementById("specs")].forEach((element) => { if (element) observer.observe(element); });
    }
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("load", remeasure);
    media.addEventListener("change", remeasure);
    return () => { observer?.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", resize); window.removeEventListener("load", remeasure); media.removeEventListener("change", remeasure); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  return (
    <div className="brochure" aria-label="赞助手册精选">
      <div className="brochure-stage" ref={stageRef}>
      <div className="brochure-sticky" ref={stickyRef}>
      <div className="brochure-heading">
        <h2>Join Us</h2>
        <div className="brochure-heading-underline" aria-hidden="true" />
        <a className="brochure-link" href={getAssetUrl("/files/sponsorship-brochure.pdf")} target="_blank" rel="noopener noreferrer">
          查看完整版赞助手册 <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </div>

      <div className="brochure-viewport" onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        const card = event.currentTarget.querySelector<HTMLElement>(".brochure-card");
        const gap = parseFloat(getComputedStyle(event.currentTarget.querySelector<HTMLElement>(".brochure-track")!).columnGap) || 0;
        cardStep.current = (card?.getBoundingClientRect().width || 1) + gap;
        dragStart.current = event.clientX;
        dragDistance.current = 0;
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={(event) => {
        if (dragStart.current === null) return;
        const distance = event.clientX - dragStart.current;
        if (Math.abs(distance) > 3) { setDragging(true); setPlaying(false); }
        dragDistance.current = Math.max(-cardStep.current, Math.min(cardStep.current, distance));
        setDrag(dragDistance.current);
      }} onPointerUp={() => {
        if (dragStart.current === null) return;
        if (Math.abs(dragDistance.current) > cardStep.current * 0.2) goTo(active + (dragDistance.current < 0 ? 1 : -1));
        dragStart.current = null;
        setDragging(false);
        setDrag(0);
      }} onPointerCancel={() => { dragStart.current = null; setDragging(false); setDrag(0); }}>
        <div className={`brochure-track${dragging || resetting ? " is-dragging" : ""}`} onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
          if (trackIndex === 1 || trackIndex === slides.length + 2) { setResetting(true); setTrackIndex(active + 2); }
        }} style={{ transform: `translateX(calc(50% - var(--card-half-width)${" - var(--card-width) - var(--card-gap)".repeat(trackIndex)} + ${drag}px))` }}>
          {[...slides.slice(-2), ...slides, ...slides.slice(0, 2)].map((slide, index) => (
            <div className="brochure-card" key={`${slide.page}-${index}`} aria-hidden={index !== trackIndex}>
              <img src={getAssetUrl(`/images/sponsorship/page-${slide.page}.webp`)} alt={`赞助手册精选：${slide.title}`} loading={index === 2 ? "eager" : "lazy"} draggable="false" />
              {index !== trackIndex && <button className="brochure-card-select" onClick={() => { if (Math.abs(dragDistance.current) > 3) return; goTo(index - 2); setPlaying(false); }} aria-label={`查看${slide.title}`} tabIndex={-1} />}
            </div>
          ))}
        </div>
      </div>

      <div className="brochure-controls">
        <div className="brochure-pagination" aria-label="选择手册页面">
          {slides.map((slide, index) => <button key={slide.page} className={`${index === active ? "active" : ""} ${index === active && playing ? "is-playing" : ""} ${dragging ? "is-dragging" : ""}`} style={dragging && (index === active || index === dragTarget) ? { width: `${8 + 40 * (index === active ? 1 - dragFraction : dragFraction)}px` } : undefined} onClick={() => { goTo(index); setPlaying(false); }} aria-label={`查看第 ${index + 1} 页：${slide.title}`} aria-current={index === active ? "true" : undefined}>{index === active && playing && <span className="brochure-progress" key={active} />}</button>)}
        </div>
        <button className="brochure-play" onClick={() => setPlaying(!playing)} aria-label={playing ? "暂停幻灯片" : "播放幻灯片"} aria-pressed={playing}>
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
      </div>
      </div>
      </div>
    </div>
  );
}
