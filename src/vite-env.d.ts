/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** CDN 源站地址，生产环境由 .env.production 注入；为空时资源回落到本地路径 */
  readonly VITE_CDN_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
