# Liquid Glass Architecture

> **⚠️ 已部分过时（2026-09-09）**
>
> 本文描述的是**纯 CSS 拟真**方案（多层渐变 + `backdrop-filter: blur()` + 伪元素高光），
> 它现在只是**磨砂态 / fallback**：非 Chromium、移动端（`<768px`）、
> `prefers-reduced-transparency`、省流量模式，或引擎未加载时生效。
>
> **折射态**由 `src/vendor/hyalite.js`（v0.3.0）接管：它按元素几何计算 SDF 位移贴图，
> 通过 `backdrop-filter: url(#…)` 得到真实折射，会**顶掉**本文里所有 blur/saturate 滤镜链
> —— 两者不叠加。改玻璃前先确认自己在改哪一层：
>
> - 几何 / 折射参数 → `src/lib/liquidGlass.ts` 的 `GLASS_PRESETS`
> - fallback 与皮肤（含 `html[data-glass="on"]` 折射态皮肤）→ `src/index.css`
> - 接入某个元素 → `useLiquidGlass(ref, preset)`
>
> 本文的层次结构、渐变构成、阴影层级对**磨砂态**仍然准确，可继续参考。
> 守则见 AGENT.md §10.1。

## 🏗️ Layer Structure

### Visual Stack (Top to Bottom)

```
┌─────────────────────────────────────────────┐
│          User Content Layer                  │ z-index: auto
│  (Text, images, interactive elements)       │
├─────────────────────────────────────────────┤
│       ::before Pseudo-Element               │ z-index: 2
│  • Top reflection highlight                 │
│  • Radial gradient (white)                  │
│  • Blurred (8-12px)                        │
│  • mix-blend-mode: overlay/soft-light      │
├─────────────────────────────────────────────┤
│          Main Element                       │ z-index: 1
│  • Multi-layer gradient background         │
│  • Backdrop-filter effects                 │
│  • Border with transparency                │
│  • Multi-shadow depth                      │
├─────────────────────────────────────────────┤
│       ::after Pseudo-Element                │ z-index: 2
│  • Bottom depth shadow                     │
│  • Radial gradient (black)                 │
│  • Blurred (6-10px)                       │
├─────────────────────────────────────────────┤
│        Background Content                   │ z-index: -1
│  (Page background, images, etc)            │
│  • Filtered through backdrop-filter        │
└─────────────────────────────────────────────┘
```

---

## 🎨 Gradient Composition

### Main Element Background (4 Layers)

```
Layer 4 (Base):        rgba(10, 10, 15, 0.75)
                       ▼
Layer 3:               radial-gradient(circle at 70% 80%, 
                       rgba(0, 0, 0, 0.15), transparent)
                       ▼
Layer 2:               radial-gradient(circle at 30% 20%, 
                       rgba(255, 255, 255, 0.12), transparent)
                       ▼
Layer 1 (Top):         linear-gradient(135deg, 
                       rgba(255, 255, 255, 0.18) 0%, 
                       rgba(255, 255, 255, 0.08) 100%)
                       ▼
                   [Final Composite]
```

### Light Source Positioning

```
     Top-Left Light (30%, 20%)
            ╔═════════════════╗
            ║ 🔆              ║
            ║                 ║
            ║       GLASS     ║
            ║                 ║
            ║              🌑 ║ Bottom-Right Shadow (70%, 80%)
            ╚═════════════════╝
```

---

## 🔄 Backdrop Filter Chain

```
Original Background
        ↓
    blur(60px)           ← Frosted glass effect
        ↓
  saturate(200%)         ← Vibrant colors
        ↓
  brightness(1.2)        ← Lighter appearance
        ↓
  contrast(1.15)         ← Enhanced definition
        ↓
   [Final Filtered]
```

---

## 💫 Shadow Hierarchy

### Box-Shadow Layers (6 Total)

```
1. Outer Shadow (Largest)    0 12px 60px rgba(0, 0, 0, 0.8)
   └─ Creates primary depth

2. Mid Shadow                 0 4px 20px rgba(0, 0, 0, 0.6)
   └─ Softens transition

3. Top Inset Highlight        0 2px 0 rgba(255, 255, 255, 0.25) inset
   └─ Simulates top glass edge

4. Bottom Inset Shadow        0 -2px 0 rgba(0, 0, 0, 0.6) inset
   └─ Simulates bottom glass edge

5. Border Glow                0 0 0 1px rgba(255, 255, 255, 0.12)
   └─ Subtle edge definition

6. Outer Glow (Hover)         0 0 60px rgba(255, 255, 255, 0.08)
   └─ Activated on hover
```

---

## 🖱️ Mouse Tracking System

### Data Flow

```
User Mouse Move
        ↓
  DOM Event Listener
        ↓
  requestAnimationFrame
        ↓
  Calculate Position
  (relative to element)
        ↓
  Normalize to 0-100%
        ↓
  Update React State
        ↓
  Set CSS Variables
  (--mouse-x, --mouse-y)
        ↓
  CSS Radial Gradient
  repositions instantly
        ↓
  Visual Update (60fps)
```

### Hook Architecture

```typescript
useMousePosition(ref, enabled)
         ↓
    ┌─────────────────┐
    │ Event Listeners │
    │  • mousemove    │
    │  • mouseleave   │
    └─────────────────┘
         ↓
    ┌─────────────────┐
    │  RAF Throttle   │ ← Prevents overload
    └─────────────────┘
         ↓
    ┌─────────────────┐
    │   Normalize     │ ← 0-100% coords
    └─────────────────┘
         ↓
    ┌─────────────────┐
    │  React State    │
    └─────────────────┘
         ↓
    { x: number, y: number }
```

---

## 🎯 Component Integration

### Navbar Dropdown

```
┌────────────────────────────┐
│   Navbar Component         │
│                            │
│  ┌──────────────────────┐  │
│  │  Dropdown Menu       │  │
│  │  ├─ dropdownRef      │  │ ← Mouse tracking target
│  │  ├─ mousePos hook    │  │
│  │  └─ CSS variables    │  │
│  │                      │  │
│  │  [2026] [2025] [...]│  │
│  └──────────────────────┘  │
│         ↑                  │
│    Mouse position          │
│    tracked here            │
└────────────────────────────┘
```

### Specs Cards

```
┌────────────────────────────────────┐
│  Specs Component                   │
│                                    │
│  ┌─────────────┐  ┌─────────────┐ │
│  │ LiquidSpec  │  │ LiquidSpec  │ │ ← Individual tracking
│  │ Card #1     │  │ Card #2     │ │
│  │             │  │             │ │
│  │ specRef ────┼──┼─ specRef    │ │
│  │ mousePos    │  │ mousePos    │ │
│  └─────────────┘  └─────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Performance Bar              │ │ ← Unified tracking
│  │  perfRef                      │ │
│  │  [Skidpad][Accel][Auto][End] │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

---

## 🔧 CSS Custom Properties

### Variable Flow

```
React Component
        ↓
  Calculate mousePos
        ↓
    { x: 45, y: 60 }
        ↓
  style={{ '--mouse-x': '45%', '--mouse-y': '60%' }}
        ↓
    CSS Stylesheet
        ↓
  radial-gradient(
    circle at var(--mouse-x) var(--mouse-y),
    rgba(255, 255, 255, 0.15),
    transparent 60%
  )
        ↓
  Browser Rendering
        ↓
  [Visual Result]
```

### Fallback Strategy

```css
/* Without custom properties */
radial-gradient(
  circle at 50% 50%,     /* ← Default center */
  rgba(255, 255, 255, 0.15),
  transparent 60%
)

/* With mouse tracking */
radial-gradient(
  circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
  rgba(255, 255, 255, 0.15),
  transparent 60%
)
```

---

## ⚡ Performance Architecture

### Optimization Layers

```
┌─────────────────────────────────────┐
│  User Interaction                   │
├─────────────────────────────────────┤
│  Conditional Check                  │ ← enabled prop
│  • Is element visible?              │
│  • Is element hovered?              │
│  • Is mobile device?                │
├─────────────────────────────────────┤
│  Event Handler                      │
│  • Capture mouse coordinates        │
├─────────────────────────────────────┤
│  RAF Throttle                       │ ← Max 60fps
│  • Cancel previous frame            │
│  • Schedule new frame               │
├─────────────────────────────────────┤
│  Calculate & Normalize              │
│  • getBoundingClientRect()          │
│  • Normalize to percentage          │
│  • Clamp values (0-100%)            │
├─────────────────────────────────────┤
│  React State Update                 │ ← Batched by React
│  • Single state object              │
│  • Minimal re-renders               │
├─────────────────────────────────────┤
│  Browser Paint                      │ ← GPU accelerated
│  • CSS custom property update       │
│  • Gradient reposition (instant)    │
└─────────────────────────────────────┘
```

### Mobile Optimization

```
Desktop (60-80px blur)
        ↓
    Media Query
  @media (max-width: 768px)
        ↓
Mobile (24px blur)
        ↓
  Pseudo-elements: none
        ↓
  Simplified gradients
        ↓
  Mouse tracking disabled
```

---

## 🎨 State Transitions

### Hover Animation Flow

```
Default State
  ↓ (hover trigger)
Transition Start
  ↓ (0.35s cubic-bezier)
  • Blur: 60px → 80px
  • Brightness: 1.2 → 1.3
  • Saturation: 200% → 220%
  • Scale: 1.0 → 1.03
  • TranslateY: 0 → -3px
  • Border opacity: 0.3 → 0.5
  • Shadow: expand + glow
  ↓
Hover State (complete)
  ↓ (mouse leave)
Transition End (reverse)
  ↓ (0.35s cubic-bezier)
Default State (restore)
```

---

## 🌈 Blend Mode Strategy

### Visual Composition

```
Background Layer
        ↓
Main Glass Element (normal blend)
        ↓
::before Highlight (overlay/soft-light blend)
  • Brightens underlying colors
  • Preserves details
  • Natural light diffusion
        ↓
Content Layer (normal blend)
        ↓
[Final Composite]
```

---

## 🔍 Debugging Architecture

### Inspection Points

```
1. Component Level
   └─ Check ref attachment
   └─ Verify enabled prop
   └─ Console.log mousePos

2. Hook Level
   └─ RAF execution check
   └─ Event listener attachment
   └─ Cleanup on unmount

3. CSS Level
   └─ Inspect computed styles
   └─ Check custom property values
   └─ Verify backdrop-filter support

4. Performance Level
   └─ React DevTools Profiler
   └─ Browser Performance tab
   └─ Frame rate monitoring
```

---

## 📊 Rendering Pipeline

```
React Component Render
        ↓
Create ref & attach hook
        ↓
useEffect setup
  • Add event listeners
  • Start tracking
        ↓
User moves mouse
        ↓
RAF schedules update
        ↓
Calculate normalized position
        ↓
setState (batched)
        ↓
React re-render (optimized)
        ↓
Update style prop
        ↓
Browser applies CSS variables
        ↓
GPU-accelerated paint
        ↓
60fps visual update
```

---

## 🎯 Design Principles

### Hierarchy of Effects

```
Level 1: Base Glass
  └─ Blur + Transparency

Level 2: Depth
  └─ Multi-layer shadows
  └─ Inset highlights

Level 3: Light Simulation
  └─ Gradient positioning
  └─ Pseudo-element reflections

Level 4: Interaction
  └─ Mouse tracking
  └─ Hover enhancements

Level 5: Motion
  └─ Smooth transitions
  └─ Scale + elevation
```

---

*Visual architecture for Aurora Racing Liquid Glass System*
