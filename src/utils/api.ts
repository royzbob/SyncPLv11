/**
 * Helper to construct proper API endpoint URLs for local dev, cloud containers, and desktop environments.
 */
export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isTauri = typeof window !== "undefined" && (
    Boolean((window as any).__TAURI__) || 
    window.location.protocol === "tauri:" || 
    window.location.protocol === "asset:" ||
    window.location.hostname === "tauri.localhost" ||
    window.location.hostname === ""
  );

  if (isTauri) {
    const baseUrl = ((import.meta as any).env?.VITE_API_URL || "https://ais-pre-xnvqqymkqsq3dfmi7u62th-361590815324.us-west2.run.app").replace(/\/$/, "");
    return `${baseUrl}${normalizedPath}`;
  }
  return normalizedPath;
}

/**
 * Safely executes a fetch request and parses JSON without throwing SyntaxError if the server returns non-JSON.
 */
export async function safeFetchJson<T = any>(
  pathOrUrl: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = getApiUrl(pathOrUrl);
  const res = await fetch(url, options);
  const text = await res.text();
  
  let data: any = {};
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.warn(`[API Info] Non-JSON response received from ${url}:`, text.substring(0, 150));
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      data = { message: text } as any;
    }
  }

  return { ok: res.ok, status: res.status, data };
}
