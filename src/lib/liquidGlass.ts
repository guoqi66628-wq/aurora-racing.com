/**
 * 液态玻璃（真实折射）加载与参数中心。
 *
 * 站点的玻璃有两态：
 *   - 折射态：hyalite 接管 backdrop-filter，写入 `--hyalite: url(#…)`（仅 Chromium 桌面端）
 *   - 磨砂态：CSS 里 `var(--hyalite, blur(…))` 的 fallback 生效，即升级前的观感
 *
 * 引擎按需懒加载，绝不进首屏关键路径；判定不通过时连 chunk 都不会请求。
 * 折射参数集中在 GLASS_PRESETS，不要把数值散进组件。
 */

import type { HyaliteAPI, HyaliteOptions } from "../vendor/hyalite";

/** 与 useIsMobile 的默认断点、Tailwind md 保持一致 */
export const GLASS_DESKTOP_BREAKPOINT = 768;

export type GlassPreset = "pill" | "panel" | "control";

/**
 * light: -40 而非上游默认的 -145。现有 CSS 皮肤的高光在顶部/左上
 * （radial at 50% 0% + linear 135deg），默认值的左下方向会与它打对台。
 */
const COMMON = { light: -40, smooth: 1 } as const;

export const GLASS_PRESETS: Record<GlassPreset, HyaliteOptions> = {
  /**
   * Specs 参数胶囊与性能条：压在赛车大图上。
   * blur 必须小 —— 折射与色散的前提都是"看得见背后"，重磨砂会把两者一起糊掉。
   * dispersion 拉到上限 0.5：色散强度取决于背景明暗结构，深色影棚背景本身可拆的
   * 边缘不多，只在绿色光带、白色车身这类高对比处显现（实测见 docs 对比图）。
   * dispersion > 0 即为每通道一遍（3 遍），从 0.07 提到 0.5 不增加 pass 数。
   */
  pill: { ...COMMON, bevel: 28, thickness: 28, blur: 1, dispersion: 0.5, rim: 0.8, materialize: 0 },
  /** 导航岛 / 下拉 / 移动菜单：凭空出现的面，用 materialize 让折射涨起来 */
  panel: { ...COMMON, bevel: 24, thickness: 20, blur: 3, dispersion: 0.4, rim: 0.7, materialize: 200 },
  /** 48px 圆形控件：尺寸小，bevel 会被圆角 clamp，靠 thickness 撑位移 */
  control: { ...COMMON, bevel: 14, thickness: 16, blur: 1, dispersion: 0.35, rim: 0.8, materialize: 0 },
};

/**
 * URL 逃生阀：`?glass=off` / `?glass=force` 写到 <html data-hyalite>，
 * hyalite 的 supported() 会直接读这个属性，线上排障不必发版。
 */
function applyUrlOverride(): void {
  try {
    const flag = new URLSearchParams(window.location.search).get("glass");
    if (flag === "off" || flag === "force") {
      document.documentElement.dataset.hyalite = flag;
    }
  } catch {
    // URL 解析失败不应影响渲染，忽略
  }
}

function isDesktopViewport(): boolean {
  return window.matchMedia(`(min-width: ${GLASS_DESKTOP_BREAKPOINT}px)`).matches;
}

/**
 * 是否允许开启真实折射。引擎能力判定交给 hyalite 的 supported()
 * （它同时处理 CSS.supports、Chromium 嗅探与 data-hyalite 覆盖）。
 */
function isRefractionAllowed(api: HyaliteAPI): boolean {
  if (!api.supported()) return false;
  // 移动端一律关闭：每个折射面都是独立渲染面，中低端机滚动掉帧风险高
  if (!isDesktopViewport()) return false;
  if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return false;
  return true;
}

let enginePromise: Promise<HyaliteAPI | null> | null = null;

/**
 * 懒加载 hyalite。返回 null 表示本环境走磨砂态（CSS fallback）。
 * 单例：多个组件并发调用只会加载一次。
 */
export function ensureHyalite(): Promise<HyaliteAPI | null> {
  if (enginePromise) return enginePromise;

  enginePromise = new Promise<HyaliteAPI | null>((resolve) => {
    if (typeof window === "undefined") return resolve(null);

    applyUrlOverride();
    const override = document.documentElement.dataset.hyalite;

    // 提前挡掉必然不支持的环境，连 chunk 请求都省掉
    if (override !== "force" && (override === "off" || !isDesktopViewport())) {
      return resolve(null);
    }

    // 🔧 修复：立即加载而不是等待 idle，确保 Specs 挂载时引擎已就绪
    void import("../vendor/hyalite.js")
      .then(() => {
        const api = window.Hyalite;
        if (!api || !isRefractionAllowed(api)) return resolve(null);
        // 皮肤据此降低高光与底色不透明度，让折射透出来
        document.documentElement.dataset.glass = "on";
        console.log('[Hyalite] Engine loaded, supported:', api.supported());
        resolve(api);
      })
      .catch((err) => {
        console.error('[Hyalite] Failed to load:', err);
        resolve(null);
      });
  });

  return enginePromise;
}
