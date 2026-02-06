/**
 * Resolve an API base URL that is safe to use in the Office taskpane environment.
 *
 * Why this exists:
 * - In normal web dev, relative URLs like `/api/...` work and can be proxied by the dev server.
 * - In Office taskpanes (WKWebView / custom schemes / null origin), relative URL resolution can throw
 *   `SyntaxError: The string did not match the expected pattern.`
 *
 * This helper prefers an explicit backend origin (REACT_APP_API_BASE_URL). If none is provided,
 * it falls back to window.origin only when it is http(s), which keeps proxy-based dev working.
 */

export function resolveApiBaseUrl(): string {
  const envBase = (process.env.REACT_APP_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (envBase) return envBase;

  if (typeof window !== "undefined") {
    const origin = window.location?.origin;
    // Only use origin when it is an actual http(s) origin (dev-server proxy / same-origin prod).
    if (origin && origin !== "null" && /^https?:\/\//i.test(origin)) {
      return origin.replace(/\/+$/, "");
    }
  }

  // Empty means "use relative URLs" (if the environment supports them).
  return "";
}

export function buildApiUrl(path: string): string {
  const baseUrl = resolveApiBaseUrl();

  if (!baseUrl) {
    // If we're not on an http(s) origin (common in Office taskpane environments), relative fetches
    // can throw a confusing URL parsing SyntaxError. Surface an actionable message instead.
    if (typeof window !== "undefined") {
      const origin = window.location?.origin;
      if (!origin || origin === "null" || !/^https?:\/\//i.test(origin)) {
        throw new Error(
          `Cannot call backend API from origin "${origin ?? "unknown"}". Set REACT_APP_API_BASE_URL (e.g. "https://localhost:3003") and reload the taskpane.`
        );
      }
    }
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}


