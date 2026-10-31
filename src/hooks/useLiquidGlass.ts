/**
 * 把一个元素接入真实折射。
 *
 * 不用 Hyalite.watch()：它会在容器上挂全子树 MutationObserver（childList + class），
 * 而本站 Specs / Navbar 大量使用 AnimatePresence 增删节点，成本与时序都不可控。
 * 逐元素 attach/detach 天然对齐 React 生命周期。
 *
 * 引擎不可用时（非 Chromium、移动端、reduced-transparency、saveData）什么都不做，
 * CSS 里 `var(--hyalite, blur(…))` 的 fallback 直接生效。
 */

import { useEffect } from "react";
import type { RefObject } from "react";
import { ensureHyalite, GLASS_PRESETS, GLASS_DESKTOP_BREAKPOINT, type GlassPreset } from "../lib/liquidGlass";

export function useLiquidGlass(
  ref: RefObject<HTMLElement | null>,
  preset: GlassPreset,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let generation = 0;
    const desktop = window.matchMedia(`(min-width: ${GLASS_DESKTOP_BREAKPOINT}px)`);
    const reducedTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)");

    const sync = () => {
      const currentGeneration = ++generation;
      cleanup?.();
      cleanup = null;
      if (!desktop.matches || reducedTransparency.matches) return;

      void ensureHyalite().then((api) => {
        if (cancelled || currentGeneration !== generation || !api) return;
        const el = ref.current;
        if (!el) return;

        api.attach(el, GLASS_PRESETS[preset]);
        // CSS consumes the live --hyalite variable. Materialize and resize may
        // replace its URL, so never pin backdrop-filter to a one-time snapshot.
        cleanup = () => api.detach(el);
      });
    };

    sync();
    desktop.addEventListener("change", sync);
    reducedTransparency.addEventListener("change", sync);

    return () => {
      cancelled = true;
      generation++;
      desktop.removeEventListener("change", sync);
      reducedTransparency.removeEventListener("change", sync);
      cleanup?.();
      cleanup = null;
    };
  }, [ref, preset, enabled]);
}
