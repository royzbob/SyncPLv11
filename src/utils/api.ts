/**
 * Helper to construct proper API endpoint URLs for local dev and cloud containers.
 */
export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath;
}
