// Wszystkie zapytania ida pod wzgledny adres /api (w dev przez proxy Vite),
// wiec ciasteczko sesji jest "nasze" i nie trzeba SameSite=None.

const CSRF_COOKIE = "XSRF-TOKEN";
const CSRF_HEADER = "X-XSRF-TOKEN";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

function readCookie(name: string): string | null {
  for (const part of document.cookie.split("; ")) {
    const separator = part.indexOf("=");
    if (part.slice(0, separator) === name) {
      return decodeURIComponent(part.slice(separator + 1));
    }
  }
  return null;
}

// Backend wydaje token CSRF w ciasteczku i zmienia go po zalogowaniu,
// wiec gdy go brakuje, prosimy o nowy.
async function csrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing !== null && existing !== "") {
    return existing;
  }

  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  const token = readCookie(CSRF_COOKIE);
  if (!response.ok || token === null) {
    throw new ApiError(response.status);
  }
  return token;
}

type ApiRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function apiFetch(
  path: string,
  { method = "GET", body }: ApiRequest = {},
): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (method !== "GET") {
    headers.set(CSRF_HEADER, await csrfToken());
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response;
}
