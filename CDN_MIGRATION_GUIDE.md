# OSS + CDN 迁移指南

## 一、为什么要做 OSS + CDN

### 当前问题
- 所有静态资源（图片、JS、CSS）都在服务器上，用户访问慢
- 首屏 hero 图片（桌面版 1.2MB + 移动版 800KB）加载时间长
- 服务器带宽压力大，成本高

### 迁移后收益
- **加载速度提升 60-80%**（CDN 边缘节点就近分发）
- **服务器带宽成本降低 70%+**（静态资源不走源站）
- **用户体验优化**（图片/视频秒开，首屏渲染快）

---

## 二、技术方案

### 架构
```
用户请求
  ├─ HTML/API → 你的服务器（动态内容）
  └─ 图片/JS/CSS → CDN → OSS（静态资源）
```

### 已完成的代码改造
1. ✅ 创建了 `src/utils/cdn.ts` 工具函数
2. ✅ 添加了 `.env.production` 配置 CDN 地址
3. ✅ 更新了 `Home.tsx` 中的 hero 图片引用

### 待处理
- [ ] 更新其他组件的图片引用（Heritage、Team、Partners 等）
- [ ] 上传图片到 OSS
- [ ] 配置 CDN 域名
- [ ] 构建并部署新版本

---

##三、服务商选择

### 方案对比

| 服务商 | 存储价格 | CDN流量价格 | 免费额度 | 推荐度 |
|--------|----------|------------|---------|--------|
| **七牛云** | ¥0.148/GB/月 | ¥0.29/GB | 10GB存储+10GB流量/月 | ⭐⭐⭐⭐⭐ 初期首选 |
| **阿里云OSS** | ¥0.12/GB/月 | ¥0.24/GB | 无 | ⭐⭐⭐⭐ 长期稳定 |
| **腾讯云COS** | ¥0.099/GB/月 | ¥0.21/GB | 50GB存储+10GB流量/6个月 | ⭐⭐⭐⭐ 性价比高 |

**推荐方案**：
1. **测试/小流量（<5000 UV/天）**：七牛云（免费额度够用）
2. **生产/中流量（5000-5万 UV/天）**：腾讯云（最便宜）
3. **企业/大流量（>5万 UV/天）**：阿里云（生态完善）

---

## 四、操作步骤（以七牛云为例）

### Step 1: 注册并创建存储空间

1. 访问 [七牛云官网](https://www.qiniu.com/) 注册账号
2. 进入 **对象存储** → **新建存储空间**
   ```
   空间名称: aurora-racing-assets
   存储区域: 华南（离深圳近）
   访问控制: 公开
   ```

### Step 2: 上传图片到 OSS

#### 方式一：Web 控制台（简单）
1. 进入刚创建的 Bucket
2. 点击「上传文件」→ 选择 `public/images` 整个文件夹
3. 保持目录结构上传（`images/hero/hero-desktop.webp`）

#### 方式二：CLI 工具（推荐，自动化）
```bash
# 1. 安装七牛 CLI
npm install -g qshell

# 2. 获取 AK/SK
# 进入七牛控制台 → 密钥管理 → 复制 AccessKey 和 SecretKey

# 3. 配置账号
qshell account <你的AccessKey> <你的SecretKey> aurora

# 4. 批量上传（保持目录结构）
cd d:/桌面/aurora-racing
qshell qupload2 \
  --bucket=aurora-racing-assets \
  --src-dir=./public/images \
  --key-prefix=images/

# 上传成功后会显示：
# ✓ 上传成功: images/hero/hero-desktop.webp
# ✓ 上传成功: images/hero/hero-mobile.webp
# ...
```

### Step 3: 配置 CDN 域名

#### 3.1 绑定自定义域名
1. 在七牛控制台：Bucket → **域名管理** → **绑定域名**
   ```
   自定义域名: cdn.auroraracing.com
   CNAME: <七牛提供的域名>.qiniucdn.com
   ```

#### 3.2 添加 DNS 解析
到你的域名 DNS 服务商（阿里云/腾讯云/Cloudflare）添加 CNAME 记录：
```
类型: CNAME
主机记录: cdn
记录值: <七牛提供的 CNAME 地址>
TTL: 600
```

#### 3.3 开启 HTTPS
1. 七牛控制台 → HTTPS 配置 → **申请免费证书**
2. 等待签发（1-5分钟）
3. 强制 HTTPS：开启「HTTP → HTTPS 跳转」

#### 3.4 CDN 加速配置（可选但推荐）
```
缓存配置:
  - *.webp, *.jpg, *.png → 缓存 30 天
  - *.js, *.css → 缓存 7 天
  - *.html → 不缓存

回源配置:
  - Range 回源：开启（支持断点续传）
  
防盗链（可选）:
  - 白名单: auroraracing.com, *.auroraracing.com
```

### Step 4: 更新代码配置

编辑 `.env.production`：
```bash
VITE_CDN_URL=https://cdn.auroraracing.com
```

### Step 5: 构建并部署

```bash
# 1. 本地测试 CDN 配置
npm run build
npm run preview
# 打开浏览器 Network 面板，确认图片请求走的是 cdn.auroraracing.com

# 2. 部署到服务器
# 上传 dist/ 文件夹到服务器替换旧版本
```

---

## 五、验证效果

### 检查 CDN 是否生效
```bash
# 1. 查看响应头（CDN 会添加特定头）
curl -I https://cdn.auroraracing.com/images/hero/hero-desktop.webp

# 应该看到：
# X-Qiniu-Zone: ...（七牛的标识）
# Age: 123（缓存命中时间）
# Cache-Control: max-age=2592000

# 2. 测速对比（Chrome DevTools Network 面板）
# 迁移前: hero-desktop.webp 加载 2-5 秒（取决于服务器带宽）
# 迁移后: hero-desktop.webp 加载 < 500ms（CDN 边缘节点）
```

### 性能指标
在 Chrome DevTools → Lighthouse 跑一次测试，对比：
- **FCP (First Contentful Paint)**: 应该从 2s+ 降到 < 1s
- **LCP (Largest Contentful Paint)**: 应该从 3s+ 降到 < 2s
- **Speed Index**: 应该提升 40%+

---

## 六、成本估算

### 示例场景
- 日均访问: 1000 UV
- 人均加载: 3MB（2 张 hero 图 + 其他资源）
- 月流量: 1000 × 3MB × 30 天 = 90GB

### 七牛云（免费额度内）
```
存储: 50MB（图片总大小）< 10GB 免费 ✅
流量: 90GB > 10GB 免费，超出 80GB
成本: 80GB × ¥0.29 = ¥23.2/月
```

### 对比：不用 CDN（服务器直接分发）
```
带宽: 90GB ÷ 30 天 ÷ 24h ÷ 3600s × 8 = 约 0.3Mbps 平均
按阿里云 ECS 固定带宽计费: 1Mbps ≈ ¥23/月
成本: ¥23/月（且高峰期可能不够用）
```

**结论**：小流量下 CDN 成本持平，但用户体验大幅提升；中大流量下 CDN 更便宜。

---

## 七、进阶优化（可选）

### 1. 图片格式优化
```bash
# WebP 已经很好，但可以进一步压缩
npx @squoosh/cli --webp '{"quality":85,"target_size":0,"method":4}' \
  public/images/**/*.webp
```

### 2. 响应式图片
```tsx
<img
  src={getAssetUrl("/images/hero/hero-desktop.webp")}
  srcSet={`
    ${getAssetUrl("/images/hero/hero-desktop-480w.webp")} 480w,
    ${getAssetUrl("/images/hero/hero-desktop-1024w.webp")} 1024w,
    ${getAssetUrl("/images/hero/hero-desktop.webp")} 1920w
  `}
  sizes="(max-width: 768px) 480px, (max-width: 1024px) 1024px, 1920px"
/>
```

### 3. 预加载关键资源
```html
<!-- 在 index.html <head> 里加 -->
<link rel="preload" as="image" 
  href="https://cdn.auroraracing.com/images/hero/hero-desktop.webp"
  imagesrcset="
    https://cdn.auroraracing.com/images/hero/hero-desktop-480w.webp 480w,
    https://cdn.auroraracing.com/images/hero/hero-desktop.webp 1920w
  "
  imagesizes="100vw">
```

### 4. CDN 智能压缩（七牛云 imageMogr2）
图片 URL 加参数自动处理：
```tsx
// 移动端自动缩小尺寸 + 压缩
getAssetUrl("/images/hero/hero-desktop.webp") + "?imageMogr2/thumbnail/!50p/quality/85"
```

---

## 八、常见问题

### Q1: CDN 更新图片后，用户看到的还是旧图？
**A**: CDN 缓存未刷新。解决方法：
```bash
# 方法1: 七牛控制台 → 刷新预取 → 输入文件 URL → 提交
# 方法2: CLI 刷新
qshell cdnrefresh --dirs "https://cdn.auroraracing.com/images/hero/"
```

### Q2: 本地开发时图片加载不到？
**A**: 本地开发不走 CDN，检查 `.env.production` 只在生产环境生效。本地用 `.env.development`：
```bash
# .env.development（不填 CDN_URL，走本地）
VITE_CDN_URL=
```

### Q3: 七牛免费额度用完了怎么办？
**A**: 
- 方案1: 付费继续用（¥20-30/月通常够用）
- 方案2: 切换到腾讯云 COS（前 6 个月免费，价格更低）
- 方案3: 自建 CDN（成本高，不推荐）

---

## 九、下一步行动清单

- [ ] **立即做**：注册七牛云，上传图片测试（30 分钟）
- [ ] **今天做**：配置 CDN 域名 + HTTPS（1 小时）
- [ ] **明天做**：更新剩余组件代码，构建部署（2 小时）
- [ ] **后续优化**：监控流量，按需切换服务商或优化图片（持续）

---

有问题随时问！🚀
