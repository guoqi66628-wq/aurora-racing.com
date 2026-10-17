# 阿里巴巴普惠体 3

2026-10-16 从[阿里巴巴字体官网](https://www.alibabafonts.com/)提供的官方字体域名下载。以下 WOFF2 文件保持原样，未转换或裁剪；原始许可文本保存在同目录 `LICENSE.md`，来源为[官方许可链接](https://www.yuque.com/yiguang-wkqc2/hgpff0/nus9wiinq4aeiegy)。

| 文件 | CSS 字重 | 字节数 | SHA-256 |
| --- | --- | --- | --- |
| AlibabaPuHuiTi-3-55-Regular.woff2 | 400 | 5256740 | 1cb8418d80b01ec08cb6f2d64b6244aaaf1bb80dc35491b66ddba16c5e24f444 |
| AlibabaPuHuiTi-3-65-Medium.woff2 | 500 | 5469328 | 628a0d5be684bae0e7a8e3ad15b7c4f623fd15b3375082624f778326e343467a |
| AlibabaPuHuiTi-3-75-SemiBold.woff2 | 600 | 5481108 | 75e2ba042e1c8ad8cf3dd5bf26f25984ffeca6c4ebb86977c8f8e1abeeb2652f |

下载地址模板：`https://fonts.alibabadesign.com/AlibabaPuHuiTi-3/{文件名去除扩展名}/{文件名}`。

仅用于登录页右侧表单。三个完整字库合计约 15.46 MiB，使用 `font-display: swap`，字体加载时先显示系统字体。完整中文字库也覆盖用户输入，不依赖外部字体服务。Vite 构建后字体位于 `dist/assets/`；独立登录包把 CSS 引用改为 `/login-assets/`，并携带原始许可文本。
