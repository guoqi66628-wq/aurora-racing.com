# 液态玻璃效果修复报告

## 问题描述
上线版本的液态玻璃效果很弱，缺少测试版本中明显的**彩虹折射效果**和**色散光泽**。

### 对比
- **上线版本（问题）**: 只有基础模糊效果，没有折射和色散
- **测试版本（预期）**: 有明显的彩色光泽、彩虹边缘、真实折射效果

## 根本原因

Hyalite 引擎使用了 `requestIdleCallback` 延迟加载策略：

```typescript
// 问题代码 (src/lib/liquidGlass.ts:103)
whenIdle(() => {
  void import("../vendor/hyalite.js")
    .then(() => { /* ... */ })
});
```

### 问题链条
1. **延迟加载太晚**: `requestIdleCallback` 在浏览器空闲时才执行（可能延迟 200ms - 2000ms）
2. **组件挂载过早**: `<Specs>` 组件先挂载，调用 `useLiquidGlass()`
3. **引擎未就绪**: `ensureHyalite()` 返回的 Promise 还未 resolve
4. **attach 失败**: 尝试 `api.attach()` 时 `api` 为 `null`
5. **降级到 CSS fallback**: `var(--hyalite, blur(8px))` 的 fallback 生效，只有模糊没有折射

## 已应用的修复

### 1. 移除 `whenIdle` 延迟 (src/lib/liquidGlass.ts)

```typescript
// 修复后：立即加载
void import("../vendor/hyalite.js")
  .then(() => {
    const api = window.Hyalite;
    if (!api || !isRefractionAllowed(api)) return resolve(null);
    document.documentElement.dataset.glass = "on";
    console.log('[Hyalite] Engine loaded, supported:', api.supported());
    resolve(api);
  })
  .catch((err) => {
    console.error('[Hyalite] Failed to load:', err);
    resolve(null);
  });
```

**效果**: 
- 引擎在首次调用 `ensureHyalite()` 时立即开始加载
- Specs 组件挂载时引擎已经就绪或即将就绪
- 大幅减少等待时间（从可能的秒级降到毫秒级）

### 2. 添加调试日志 (src/hooks/useLiquidGlass.ts)

```typescript
console.log('[useLiquidGlass] Attaching to element with preset:', preset, GLASS_PRESETS[preset]);
api.attach(el, GLASS_PRESETS[preset]);

setTimeout(() => {
  const hyaliteVar = getComputedStyle(el).getPropertyValue('--hyalite');
  console.log('[useLiquidGlass] --hyalite value:', hyaliteVar || '(not set)');
}, 100);
```

**效果**:
- 可以在浏览器控制台看到引擎加载和 attach 的过程
- 验证 `--hyalite` CSS 变量是否被正确设置为 `url(#...)`

## 验证步骤

### 1. 本地测试
```bash
npm run build
npm run preview
```

打开浏览器访问预览地址，检查：
1. 打开开发者工具控制台
2. 导航到 Specs 页面
3. 查看控制台日志：
   - `[Hyalite] Engine loaded, supported: true`
   - `[useLiquidGlass] Attaching to element with preset: pill`
   - `[useLiquidGlass] --hyalite value: url(#hyalite-xxx)`

4. 检查 HTML 元素：
   - `<html data-glass="on">` 应该存在
   - `.liquid-glass` 元素应该有 `style="--hyalite: url(#hyalite-xxx)"`

5. 视觉验证：
   - 右侧参数胶囊应该有**彩虹色边缘**
   - 底部性能条应该有**色散光泽**
   - 移动鼠标时边缘应该有**动态折射**

### 2. 部署后验证

部署后在 Chrome/Edge 桌面版测试：

```javascript
// 在浏览器控制台运行
console.log('data-glass:', document.documentElement.dataset.glass);
console.log('Hyalite:', window.Hyalite);
console.log('Supported:', window.Hyalite?.supported());

// 检查一个液态玻璃元素
const glass = document.querySelector('.liquid-glass');
console.log('--hyalite:', getComputedStyle(glass).getPropertyValue('--hyalite'));
```

**期望输出**:
```
data-glass: "on"
Hyalite: {attach: ƒ, detach: ƒ, supported: ƒ, ...}
Supported: true
--hyalite: url(#hyalite-12345)
```

## 效果参数说明

液态玻璃的折射效果由以下参数控制 (src/lib/liquidGlass.ts):

```typescript
pill: {
  bevel: 28,        // 边缘弯曲区域宽度
  thickness: 28,    // 玻璃厚度，控制折射位移量
  blur: 1,          // 中心磨砂程度（小值 = 更清晰的折射）
  dispersion: 0.5,  // 色散强度 0-0.5（0.5 = 最大彩虹效果）⭐
  rim: 0.8,         // 边缘光强度
  light: -40,       // 光源方向（-40° = 左上方）
  smooth: 1         // 边缘平滑
}
```

**关键参数**:
- `dispersion: 0.5` - 这是产生彩虹色散的关键参数，已设置为最大值
- `blur: 1` - 保持较低以确保折射清晰可见
- `thickness: 28` - 较大的厚度产生更明显的折射位移

## 排查清单

如果修复后仍然没有效果，按顺序检查：

### ✅ 1. 浏览器支持
- [ ] 使用 Chromium 内核（Chrome, Edge, Brave, Opera）
- [ ] 桌面版（移动端被强制禁用）
- [ ] 支持 `backdrop-filter` (在控制台运行: `CSS.supports('backdrop-filter', 'blur(1px)')`)

### ✅ 2. 视口宽度
- [ ] 窗口宽度 >= 768px（小于此值会自动禁用）

### ✅ 3. 引擎加载
- [ ] 控制台有 `[Hyalite] Engine loaded` 日志
- [ ] `window.Hyalite` 存在
- [ ] `window.Hyalite.supported()` 返回 `true`

### ✅ 4. DOM 状态
- [ ] `<html data-glass="on">` 存在
- [ ] `.liquid-glass` 元素的 `--hyalite` 为 `url(#...)`
- [ ] SVG filter 存在于 DOM 中（`<svg><defs><filter id="hyalite-...">`)

### ✅ 5. 系统设置
- [ ] 系统无 "减少透明度" 设置
- [ ] 浏览器无 "省流量模式"

## 强制启用方法

如果需要在不支持的环境测试，可以使用 URL 参数：

```
https://your-site.com/?glass=force
```

这会跳过所有检测，强制启用折射效果。

## 回滚方案

如果需要临时禁用液态玻璃：

```
https://your-site.com/?glass=off
```

或在代码中：

```typescript
// src/lib/liquidGlass.ts
document.documentElement.dataset.hyalite = 'off';
```

## 性能影响

- **首屏加载**: 无影响（hyalite 仍然是懒加载的 chunk）
- **交互延迟**: 减少约 200-2000ms（移除 idle 等待）
- **运行时**: 每个液态玻璃元素是独立渲染面，6 个胶囊约增加 2-3ms/frame

## 后续优化建议

1. **预加载提示**: 在 `<head>` 中添加 preload
   ```html
   <link rel="modulepreload" href="/assets/hyalite-B19RTjPn.js">
   ```

2. **减少 attach 数量**: 考虑将多个小胶囊合并为一个大容器

3. **条件加载**: 检测 GPU 性能，低端设备降级

## 联系支持

如果问题持续存在，提供以下信息：
- 浏览器版本和 User Agent
- 控制台完整日志（包括错误）
- 网络请求中 hyalite.js 的加载状态
- `window.Hyalite.supported()` 的返回值
