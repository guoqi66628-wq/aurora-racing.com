# 🌌 AURORA RACING - AI 辅助开发指南

这份文档概述了本项目的核心架构与开发规范，方便 AI 助手与开发者快速理解项目。

---

## 🛠 1. 技术栈 (Technology Stack)

本项目采用现代化的前端全家桶，确保高性能与极致的交互体验：
- **核心框架:** React 19 + TypeScript
- **构建工具:** Vite
- **CSS 框架:** Tailwind CSS v4 (原生支持 CSS 变量与现代语法)
- **动画引擎:** Motion (原 `framer-motion`，现版本为 `motion/react`)
- **图标库:** Lucide-React

---

## 💻 2. 环境依赖 (Environment Dependencies)

若要在本地启动本项目，请确保环境满足以下要求：
- **运行环境:** Node.js 18.x 或 20.x 及以上版本
- **包管理器:** npm (项目根目录下直接运行 `npm install`)
- **启动指令:** `npm run dev` (默认运行在 `http://localhost:3000`)
- **构建指令:** `npm run build` (生成静态产物到 `dist/` 目录)

---

## 📂 3. 目录结构 (Directory Structure)

项目采用组件化开发模式，逻辑与视图高度解耦：

```text
├── public/                 # 静态资源根目录（所有图片资源建议存放于此）
│   └── images/             # 图片资源分目录（cars, hero, team, partners...）
├── src/                    # 源代码目录
│   ├── components/         # 功能组件模块
│   │   ├── AuroraLogo.tsx  # 品牌 Logo 组件
│   │   ├── Home.tsx        # 首页 Hero 模块与倒计时
│   │   ├── Specs.tsx       # 赛车技术规格展示
│   │   ├── Team.tsx        # 团队成员介绍
│   │   ├── Partners.tsx    # 赞助商展示网格
│   │   └── ...             # 其他 UI 组件
│   ├── App.tsx             # 根组件：全局状态与页面组合
│   ├── index.css           # 全局样式定义（包含 Tailwind 指令与自定义动画）
│   └── main.tsx            # 应用挂载入口
├── package.json            # 依赖管理
└── vite.config.ts          # Vite 配置文件
```

---

## 🖼 4. 静态资源管理 (Static Resource Management)

为了方便后续维护与图片替换，本项目目前已将所有远程图片路径重构为指向 `public/` 文件夹的本地相对路径。

### 资源存放规范
- **车队成员:** 存放至 `/public/images/team/`，建议命名：`member-name.png`
- **历代赛车:** 存放至 `/public/images/cars/`，建议命名：`car-202x.png`
- **合作伙伴:** 存放至 `/public/images/partners/`，按等级命名：`strategic-1、2.png`, `top-1~3.png` ， `top-rem-1~4.png`，`tier1-1~10.png` ,`tier2-1~10.png` 等
- **画廊历史:** 存放至 `/public/images/heritage/`，建议命名：`202x-1.jpg`

### 替换建议
- **格式建议:** 背景图建议使用 WebP 或高质量 JPG；Logo 与透明底图片必须使用 PNG 或 SVG。
- **透明Logo:** 如果要更换品牌 Logo，请直接替换 `/public/images/logos/logo-desktop.png` 和 `/public/images/logos/logo-mobile.png` 下的文件，或在 `AuroraLogo.tsx` 中按需修改 SVG 代码。

🌟 **赛道见！See you on the track!**
