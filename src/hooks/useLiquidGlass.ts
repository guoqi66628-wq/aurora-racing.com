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
import { ensureHyalite, GLASS_PRESETS, type GlassPreset } from "../lib/liquidGlass";

export function useLiquidGlass(
  ref: RefObject<HTMLElement | null>,
  preset: GlassPreset,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    // 记住实际 attach 的元素与引擎：cleanup 时 ref.current 可能已被 React 置空
    let cleanup: (() => void) | null = null;

    void ensureHyalite().then((api) => {
      // 引擎加载期间组件可能已卸载
      if (cancelled || !api) {
        if (!api) console.log('[useLiquidGlass] Engine not available, using CSS fallback');
        return;
      }
      const el = ref.current;
      if (!el) return;

      console.log('[useLiquidGlass] Attaching to element with preset:', preset, GLASS_PRESETS[preset]);
      api.attach(el, GLASS_PRESETS[preset]);

      // 验证是否成功 attach
      setTimeout(() => {
        const hyaliteVar = getComputedStyle(el).getPropertyValue('--hyalite');
        console.log('[useLiquidGlass] --hyalite value:', hyaliteVar || '(not set)');
      }, 100);

      // detach 会移除 --hyalite 内联值并释放贴图缓存引用
      cleanup = () => api.detach(el);
    });

    return () => {
  cancelled = true;
      cleanup?.();
      cleanup = null;
    };
  }, [ref, preset, enabled]);
}
