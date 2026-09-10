/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * 让元素的 --mouse-x / --mouse-y 跟随指针（归一化到 0-100%），供玻璃皮肤的光泽渐变使用。
 *
 * 直接写 CSS 变量而不是 setState：后者会在 mousemove 期间按帧重渲染组件，
 * 而这些组件承载 backdrop-filter —— 折射开启后是最贵的一条路径。
 * 写变量只触发重绘，不进 React 渲染。
 */
export function useMousePositionVar(
  elementRef: RefObject<HTMLElement | null>,
  enabled = true
): void {
  useEffect(() => {
    const element = elementRef.current;
    if (!enabled || !element) return;
    // 触屏设备没有悬停语义，挂了也只是白付事件成本
    if (!window.matchMedia("(hover: hover)").matches) return;

    let rafId = 0;

    const write = (x: number, y: number) => {
      element.style.setProperty("--mouse-x", `${x}%`);
      element.style.setProperty("--mouse-y", `${y}%`);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
 write(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
      });
    };

    const handleMouseLeave = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      write(50, 50); // 回到中心
    };

    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseleave", handleMouseLeave);
      element.style.removeProperty("--mouse-x");
      element.style.removeProperty("--mouse-y");
    };
  }, [elementRef, enabled]);
}
