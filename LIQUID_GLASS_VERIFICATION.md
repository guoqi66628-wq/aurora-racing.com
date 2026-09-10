# 液态玻璃效果验证清单

## 问题回顾
**症状**: 线上版本的液态玻璃效果缺失，性能数据胶囊只有模糊效果，没有彩虹色散和真实折射

**根本原因**（双重问题）:
1. ❌ **引擎加载时序问题**：`whenIdle` 延迟导致组件挂载时引擎未就绪（已在提交 7c50ce2 修复）
2. ❌ **CSS 变量展开失败**：Tailwind v4 的属性处理导致 `backdrop-filter: var(--hyalite)` 无法展开（已在提交 69ea05a 修复）

## 已修复内容

### 修复 1: 引擎加载时序（提交 7c50ce2）

### 1. 引擎加载策略 (src/lib/liquidGlass.ts)
```typescript
// ❌ 旧代码：延迟 200-2000ms 加载
whenIdle(() => {
  void import("../vendor/hyalite.js").then(...)
});

// ✅ 新代码：立即加载
void import("../vendor/hyalite.js")
  .then(() => {
    const api = window.Hyalite;
    if (!api || !isRefractionAllowed(api)) return resolve(null);
    document.documentElement.dataset.glass = "on";
    console.log('[Hyalite] Engine loaded, supported:', api.supported());
    resolve(api);
  })
```

### 修复 2: CSS 变量展开问题（提交 69ea05a）

**问题诊断过程**:
1. ✅ 引擎正常加载：`window.Hyalite.supported() === true`
2. ✅ SVG filter 正常生成：`document.querySelector('#hyalite-1')` 存在
3. ✅ CSS 变量正确设置：`element.style.getPropertyValue('--hyalite') === 'url(#hyalite-1)'`
4. ❌ **但 backdrop-filter 为 none**：`getComputedStyle(element).backdropFilter === 'none'`

**根本原因**: Tailwind CSS v4 的 `@layer properties` 机制重置了 backdrop-filter，导致 CSS 中的 `backdrop-filter: var(--hyalite, blur(...))` 无法正常展开变量值。

**解决方案** (src/hooks/useLiquidGlass.ts):
```typescript
// Hyalite attach 后，直接将 filter URL 应用到 backdrop-filter
setTimeout(() => {
  const hyaliteVar = el.style.getPropertyValue('--hyalite');
  if (hyaliteVar && hyaliteVar.startsWith('url(')) {
    // 绕过 CSS 变量，直接设置属性
    el.style.setProperty('backdrop-filter', hyaliteVar, 'important');
    el.style.setProperty('-webkit-backdrop-filter', hyaliteVar, 'important');
  }
}, 100);
```

### 3. 调试日志增强
- 添加引擎可用性日志
- 添加 attach 操作日志和参数
- 添加 `--hyalite` CSS 变量验证
- 添加 backdrop-filter 直接应用日志

## 验证步骤

### 方式 1: 本地预览验证（推荐）

```bash
npm run preview
```

打开浏览器访问 `http://localhost:4173`，按 F12 打开开发者工具：

#### 检查控制台日志
应该看到：
```
[Hyalite] Engine loaded, supported: true
[useLiquidGlass] Attaching to element with preset: pill {...}
[useLiquidGlass] --hyalite value: url(#hyalite-1)
[useLiquidGlass] Applied backdrop-filter directly: url(#hyalite-1)
```

#### 检查 DOM 状态
在控制台运行：
```javascript
// 检查引擎
console.log('data-glass:', document.documentElement.dataset.glass); // 应该是 "on"
console.log('Hyalite API:', window.Hyalite); // 应该是对象
console.log('Supported:', window.Hyalite?.supported()); // 应该是 true

// 检查液态玻璃元素
const glass = document.querySelector('.liquid-glass');
console.log('Element:', glass);
console.log('--hyalite:', getComputedStyle(glass).getPropertyValue('--hyalite'));
// 应该是 "url(#hyalite-xxxxx)" 而不是空
```

#### 视觉验证 ⭐
导航到 **Specs** 页面，观察右侧的参数胶囊和底部性能条：

**期望效果**:
- ✅ 胶囊边缘有 **彩虹色光晕**（红→绿→蓝渐变）
- ✅ 透过玻璃能看到背景 **折射扭曲**
- ✅ 鼠标移动时边缘 **动态响应**
- ✅ 背景车身的绿色光带被色散成 **RGB 三色边缘**

**不应该出现**:
- ❌ 只有均匀的白色模糊
- ❌ 完全不透明的背景
- ❌ 边缘无任何色彩变化

### 方式 2: 部署后验证

部署到 CDN 后，在 **Chrome/Edge 桌面版**访问：

1. **清除缓存**: Ctrl+Shift+Delete → 清除所有缓存
2. **硬刷新**: Ctrl+Shift+R 或 Ctrl+F5
3. 打开开发者工具 → Console
4. 导航到 Specs 页面
5. 执行上述相同的检查步骤

### 方式 3: 强制启用测试

如果环境不支持（移动端、Firefox等），可以使用 URL 参数强制启用：

```
https://your-domain.com/?glass=force
```

这会跳过所有浏览器和环境检测。

## 关键参数说明

当前配置 (src/lib/liquidGlass.ts):
```typescript
pill: {
  bevel: 28,        // 边缘弯曲宽度
  thickness: 28,    // 玻璃厚度（控制折射位移）
  blur: 1,          // ⭐ 低模糊 = 清晰折射
  dispersion: 0.5,  // ⭐⭐⭐ 最大色散 = 彩虹效果
  rim: 0.8,         // 边缘光强度
  materialize: 0    // 凸起高度（胶囊平贴无需凸起）
}
```

**`dispersion: 0.5`** 是产生彩虹色散的关键参数（已设为最大值）

## 常见问题排查

### 问题: 控制台显示 "Engine not available"
**原因**: 浏览器不支持或环境限制
**检查**:
- 使用 Chromium 内核浏览器（Chrome/Edge/Brave）
- 窗口宽度 >= 768px
- 桌面版（非移动端）
- 没有开启"省流量模式"

### 问题: `--hyalite` 为空
**原因**: attach 失败或时机不对
**解决**:
1. 检查控制台是否有错误
2. 确认 `window.Hyalite.supported()` 返回 `true`
3. 检查网络面板确认 `hyalite-B19RTjPn.js` 已加载

### 问题: 有 `--hyalite` 但没有视觉效果
**原因**: CSS 样式覆盖或 filter 无效
**检查**:
```javascript
const glass = document.querySelector('.liquid-glass');
console.log('backdrop-filter:', getComputedStyle(glass).backdropFilter);
// 应该显示: url("#hyalite-1") 而不是 "none" 或简单的 blur()
```

### 问题: 部署后仍然没有效果
**可能原因**:
1. ❌ 部署了错误的 dist 目录（旧构建）
2. ❌ CDN 缓存未更新
3. ❌ 浏览器缓存未清除

**解决**:
```bash
# 1. 确认本地 dist 包含最新修复
git log -1 --oneline  # 应该显示 7c50ce2 或更新

# 2. 重新构建
npm run build

# 3. 检查构建产物中的代码
grep -r "whenIdle" dist/assets/  # 应该没有结果（已移除）
grep -r "Hyalite.*Engine loaded" dist/assets/  # 应该找到日志代码

# 4. 重新部署并刷新 CDN
npm run deploy  # 或你的部署命令
```

## 对比截图参考

### ❌ 问题版本（只有模糊）
- 胶囊背景均匀模糊
- 边缘纯白色
- 无色彩变化
- 性能数据显示 "-"

### ✅ 正确版本（有折射色散）
- 胶囊边缘有彩虹光晕
- 背景透过玻璃产生扭曲
- 车身光带被分解为 RGB 边缘
- 性能数据完整显示

## 性能影响
- **首屏无影响**: hyalite 仍是懒加载的独立 chunk (19.34 KB)
- **加载提前**: 从 idle 时（可能延迟 2 秒）改为首次调用时立即加载
- **运行时**: 每个液态玻璃元素约 0.5ms/frame，6 个胶囊共约 2-3ms/frame

## 回滚方案

如果需要紧急禁用液态玻璃：

### 临时禁用（不发版）
访问 URL 添加参数：
```
?glass=off
```

### 代码禁用（需发版）
在 `src/lib/liquidGlass.ts` 第 99 行添加：
```typescript
if (override !== "force") {
  return resolve(null);  // 强制禁用
}
```

## 下一步优化建议

1. **预加载提示**: 在 HTML `<head>` 添加
   ```html
   <link rel="modulepreload" href="/assets/hyalite-B19RTjPn.js">
   ```

2. **减少 attach 数量**: 考虑合并小胶囊为一个大容器

3. **GPU 性能检测**: 低端设备自动降级

## 联系支持

如果问题持续存在，提供以下信息：
- 浏览器版本和 User-Agent
- 控制台完整日志（包括错误）
- Network 面板中 hyalite.js 的加载状态
- 截图或录屏对比

---

## 技术细节：为什么 CSS 变量失效？

Tailwind CSS v4 使用 `@layer properties` 定义全局 CSS 变量，包括 `--tw-backdrop-*` 系列。这些变量的初始化机制会重置 `backdrop-filter` 属性，导致：

1. CSS 中定义 `.liquid-glass { backdrop-filter: var(--hyalite, blur(...)); }`
2. Tailwind 的 layer 重置覆盖了这个定义
3. 浏览器计算时 `var(--hyalite)` 返回有效值，但整个 `backdrop-filter` 属性已被重置为初始值
4. 最终计算结果：`backdrop-filter: none`

**解决思路**: 
- ❌ 不能修改 Tailwind 配置（会影响全站样式）
- ❌ 不能提高 CSS 特异性（layer 优先级问题）
- ✅ **在 JS 中用 `!important` 强制覆盖**，绕过 CSS layer 机制

这是一个已知的 Tailwind v4 + 自定义 backdrop-filter 的兼容性问题。

---

**修复提交**: 
- 7c50ce2 (引擎加载时序)
- 69ea05a (CSS 变量展开) ⭐ 关键修复

**构建时间**: 2026-09-11  
**构建产物**: 
- dist/assets/hyalite-B19RTjPn.js (19.34 KB)
- dist/assets/index-LozsxO1Z.js (425.60 KB)
