const WORKSPACE_ORIGIN = "https://telemetry.aurora-racing.com";

/** Only return to workspace pages; never to an external site or an API endpoint. */
export function workspaceReturnTarget(search: string): string {
  const candidate = new URLSearchParams(search).get("next");
  if (!candidate || candidate.length > 8192 || !candidate.startsWith("/") || candidate.startsWith("//")) return "/";
  if (/[\\\u0000-\u0020\u007f]/.test(candidate)) return "/";
  try {
    const url = new URL(candidate, WORKSPACE_ORIGIN);
    if (url.origin !== WORKSPACE_ORIGIN) return "/";
    const pathname = decodeURIComponent(url.pathname);
    if (/[\\\u0000-\u001f\u007f]/.test(pathname)) return "/";
    if (pathname !== "/" && !/^\/session\/[^/]+\/?$/.test(pathname)) return "/";
    const name = pathname.split("/")[2];
    if (name === "." || name === "..") return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
