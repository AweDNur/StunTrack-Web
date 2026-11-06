const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || "");
export const AI_API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_AI_API_BASE_URL || "/ai-api");

export function apiUrl(path: string) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export function aiApiUrl(path: string) {
  return `${AI_API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export function protectedMediaUrl(path: string, token = "") {
  return `${apiUrl(path)}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}
