// CDN configuration
export const CDN_URL = import.meta.env.VITE_CDN_URL || '';

// Helper function to get asset URL
export const getAssetUrl = (path: string): string => {
  // 开发环境：强制返回本地路径
  if (import.meta.env.DEV) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  // 生产环境：如果配置了 CDN 则使用，否则用本地路径
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return CDN_URL ? `${CDN_URL}/${cleanPath}` : `/${cleanPath}`;
};
