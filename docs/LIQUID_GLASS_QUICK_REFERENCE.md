# Liquid Glass Quick Reference

> **⚠️ API 已更新（2026-09-09）**：`useMousePosition` 已改名为 `useMousePositionVar`，
> 且不再返回坐标 —— 它直接写元素的 `--mouse-x/y`，避免 mousemove 期间按帧重渲染
> 承载 `backdrop-filter` 的组件。真实折射由 `useLiquidGlass(ref, preset)` 接入。
> 下面的片段已是当前写法；守则见 AGENT.md §10.1。

## 🎯 Quick Copy-Paste Snippets

### Basic Liquid Glass Element

```tsx
import { useRef } from 'react';
import { useMousePositionVar } from '../hooks/useMousePosition';
import { useLiquidGlass } from '../hooks/useLiquidGlass';

function MyComponent() {
  const glassRef = useRef<HTMLDivElement>(null);
  useMousePositionVar(glassRef);        // 皮肤光泽跟随指针（仅 hover 设备）
  useLiquidGlass(glassRef, 'pill');     // 真实折射（仅 Chromium 桌面端；其余走 CSS fallback）

  return (
    <div ref={glassRef} className="liquid-glass">
      Your content here
    </div>
  );
}
```

`preset` 取 `pill`（胶囊 / 条）、`panel`（下拉 / 菜单 / 面板）、`control`（小圆钮）之一，
定义在 `src/lib/liquidGlass.ts`。不要在组件里写折射数值。

**新增玻璃类时**，`src/index.css` 里必须带上 `--hyalite: initial` 和完整 fallback：

```css
.my-glass {
  --hyalite: initial;   /* 必须：阻断祖先继承，否则套上父元素的贴图 */
  backdrop-filter: var(--hyalite, blur(24px) saturate(180%));
  -webkit-backdrop-filter: var(--hyalite, blur(24px) saturate(180%));
}
```

---

## 🎨 CSS Classes Available

### `.liquid-glass`
**Use for:** Specs cards, feature cards, data displays  
**Features:** Full liquid glass effect with mouse tracking support  
**Shape:** Rounded pill (`border-radius: 9999px`)

```tsx
<div className="liquid-glass px-6 py-3 rounded-full">
  Content
</div>
```

### ~~`.liquid-glass-advanced`~~（已删除）
这个类做的是**假折射**（`--mouse-x/y` 驱动的径向渐变光泽），已被 hyalite 的真实折射取代，
且全站无引用，故于 2026-09-09 删除。需要圆角面板玻璃时用 `.dropdown-glass`
或 `.mobile-menu-glass` + `useLiquidGlass(ref, 'panel')`。

`.dropdown-glass-card` 同期删除（同样无引用）。

### .nav-glass (REVERTED TO SIMPLE)
**Use for:** Navigation bars, top-level menus  
**Features:** Simple blur effect (original implementation)  
**Shape:** Full-width bar

```tsx
<nav className="nav-glass">
  Navigation items
</nav>
```

### .dropdown-glass (REVERTED TO SIMPLE)
**Use for:** Dropdown menus, popovers  
**Features:** Basic dark mode glass (original implementation)  
**Shape:** Rounded corners (`border-radius: 12px`)

```tsx
<div className="dropdown-glass rounded-xl py-2">
  Menu items
</div>
```

---

## 🔧 Hook API

### `useMousePosition(ref, enabled)`

**Parameters:**
- `ref: RefObject<HTMLElement>` - React ref to the element
- `enabled: boolean` - Enable/disable tracking (default: `true`)

**Returns:**
- `{ x: number, y: number }` - Normalized coordinates (0-100%)

**Example:**
```tsx
const ref = useRef<HTMLDivElement>(null);
const mousePos = useMousePosition(ref, isHovered);
```

---

## 💡 Common Patterns

### Pattern 1: Card with Individual Tracking
Each card tracks its own mouse position:

```tsx
function Card({ title, value }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mousePos = useMousePosition(cardRef, true);

  return (
    <div
      ref={cardRef}
      className="liquid-glass p-4"
      style={{
        '--mouse-x': `${mousePos.x}%`,
        '--mouse-y': `${mousePos.y}%`,
      } as React.CSSProperties}
    >
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}
```

### Pattern 2: Container with Unified Tracking
Single tracking for entire container:

```tsx
function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useMousePosition(containerRef, true);

  return (
    <div
      ref={containerRef}
      className="liquid-glass p-8"
      style={{
        '--mouse-x': `${mousePos.x}%`,
        '--mouse-y': `${mousePos.y}%`,
      } as React.CSSProperties}
    >
      <Card />
      <Card />
      <Card />
    </div>
  );
}
```

### Pattern 3: Conditional Tracking
Only track when needed:

```tsx
function InteractiveCard() {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const mousePos = useMousePosition(cardRef, isHovered);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="liquid-glass"
      style={{
        '--mouse-x': `${mousePos.x}%`,
        '--mouse-y': `${mousePos.y}%`,
      } as React.CSSProperties}
    >
      Content
    </div>
  );
}
```

---

## 🎨 Customization Tips

### Change Base Color
```css
.liquid-glass {
  /* Light theme */
  background: rgba(255, 255, 255, 0.8);
  
  /* Dark theme */
  background: rgba(10, 10, 15, 0.75);
  
  /* Colored glass */
  background: rgba(121, 40, 202, 0.2); /* Purple */
}
```

### Adjust Blur Intensity
```css
.liquid-glass {
  /* Subtle */
  backdrop-filter: blur(20px);
  
  /* Medium (default) */
  backdrop-filter: blur(40px);
  
  /* Strong */
  backdrop-filter: blur(80px);
}
```

### Modify Border Glow
```css
.liquid-glass {
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.1); /* Outer glow */
}
```

### Animation Duration
```css
.liquid-glass {
  /* Fast */
  transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  
  /* Default */
  transition: all 0.35s cubic-bezier(0.23, 1, 0.32, 1);
  
  /* Slow/Dramatic */
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}
```

---

## ⚡ Performance Tips

### 1. Use Conditional Tracking
Only track when element is visible or hovered:
```tsx
const mousePos = useMousePosition(ref, isVisible && isHovered);
```

### 2. Reduce Blur on Mobile
```css
@media (max-width: 768px) {
  .liquid-glass {
    backdrop-filter: blur(24px); /* Instead of 60px */
  }
}
```

### 3. Disable on Low-End Devices
```tsx
const prefersReducedMotion = useReducedMotion();
const mousePos = useMousePosition(ref, !prefersReducedMotion);
```

### 4. Limit Number of Tracked Elements
Don't track every element simultaneously. Use unified tracking for groups.

---

## 🐛 Troubleshooting

### Mouse position not updating?
- Ensure `ref` is attached to DOM element
- Check `enabled` parameter is `true`
- Verify element has dimensions (width/height)

### Effects not visible?
- Check backdrop-filter browser support
- Ensure element has content behind it
- Verify background isn't fully opaque

### Performance issues?
- Reduce blur radius
- Disable tracking when not needed
- Limit number of simultaneously tracked elements
- Check for multiple RAF loops

### Type errors with style prop?
```tsx
// Add type assertion
style={{
  '--mouse-x': `${mousePos.x}%`,
  '--mouse-y': `${mousePos.y}%`,
} as React.CSSProperties}
```

---

## 📱 Mobile Considerations

### Auto-disable mouse tracking on touch devices
```tsx
import { useIsMobile } from '../hooks/useIsMobile';

function Component() {
  const isMobile = useIsMobile();
  const mousePos = useMousePosition(ref, !isMobile);
  // ...
}
```

### Simplified mobile styles
```css
@media (max-width: 768px) {
  .liquid-glass {
    backdrop-filter: blur(24px) saturate(180%);
    /* Remove complex gradients */
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.5) 100%);
  }
  
  /* Disable pseudo-elements on mobile */
  .liquid-glass::before,
  .liquid-glass::after {
    display: none;
  }
}
```

---

## 🎯 Best Practices

1. **Use sparingly** - Liquid glass is a premium effect. Don't overuse.
2. **Group tracking** - Track containers, not individual small elements
3. **Conditional enable** - Only track when hovered or visible
4. **Mobile simplification** - Reduce effects on touch devices
5. **Semantic HTML** - Glass is decoration, ensure content is accessible
6. **Contrast check** - Ensure text is readable over glass backgrounds
7. **Performance monitoring** - Use React DevTools Profiler to check render times

---

## 🔗 Related Files

- **CSS:** `src/index.css` - All liquid glass styles
- **Hook:** `src/hooks/useMousePosition.ts` - Mouse tracking
- **Examples:** 
  - `src/components/Navbar.tsx` - Dropdown implementation
  - `src/components/Specs.tsx` - Card implementation
- **Docs:**
  - `LIQUID_GLASS_ENHANCEMENTS.md` - Full enhancement docs
  - `docs/LIQUID_GLASS_COMPARISON.md` - Before/after comparison

---

*Quick Reference for Aurora Racing Liquid Glass System*
