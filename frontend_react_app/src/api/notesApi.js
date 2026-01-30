/**
 * Notes API client.
 *
 * Uses environment variables to determine backend base URL:
 * - Prefer: REACT_APP_API_BASE
 * - Fallback: REACT_APP_BACKEND_URL
 *
 * The backend is expected to provide REST endpoints similar to:
 *  - GET    /notes
 *  - POST   /notes
 *  - PUT    /notes/:id   (or PATCH)
 *  - DELETE /notes/:id
 * Optional:
 *  - GET /notes/search?q=... or GET /notes?q=...
 */

/** Normalize base URL: remove trailing slashes. */
function normalizeBaseUrl(url) {
  if (!url) return "";
  return String(url).replace(/\/+$/, "");
}

/** Attempt to read base URL from environment variables. */
function getApiBaseUrl() {
  const preferred = process.env.REACT_APP_API_BASE;
  const fallback = process.env.REACT_APP_BACKEND_URL;
  return normalizeBaseUrl(preferred || fallback || "");
}

/**
 * Low-level JSON request helper with consistent error handling.
 * @param {string} path path starting with "/"
 * @param {RequestInit} options fetch options
 * @param {AbortSignal=} signal abort signal
 */
async function requestJson(path, options = {}, signal) {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}${path}` : path; // If no base URL is provided, attempt same-origin.

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers, signal });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (isJson) {
      try {
        const data = await res.json();
        message = data?.detail || data?.message || message;
      } catch {
        // ignore
      }
    } else {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {
        // ignore
      }
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  if (isJson) return res.json();
  return res.text();
}

/** Try to adapt backend note shapes to a consistent UI shape. */
function normalizeNote(raw) {
  if (!raw || typeof raw !== "object") return null;

  // Common id fields
  const id = raw.id ?? raw.note_id ?? raw._id ?? raw.uuid ?? null;

  return {
    ...raw,
    id,
    title: raw.title ?? "",
    content: raw.content ?? raw.body ?? "",
  };
}

function normalizeNotesResponse(data) {
  // Accept array or {items:[...]} or {notes:[...]}
  const list = Array.isArray(data) ? data : data?.items || data?.notes || [];
  return list.map(normalizeNote).filter(Boolean);
}

// PUBLIC_INTERFACE
export async function listNotes({ signal } = {}) {
  /** List all notes. */
  const data = await requestJson("/notes", { method: "GET" }, signal);
  return normalizeNotesResponse(data);
}

// PUBLIC_INTERFACE
export async function createNote(payload, { signal } = {}) {
  /** Create a note. Expects {title, content}. */
  const data = await requestJson(
    "/notes",
    {
      method: "POST",
      body: JSON.stringify({
        title: payload?.title ?? "",
        content: payload?.content ?? "",
      }),
    },
    signal
  );

  const normalized = normalizeNote(data);
  // Some backends return the created note; others return nothing.
  return normalized || null;
}

// PUBLIC_INTERFACE
export async function updateNote(id, payload, { signal } = {}) {
  /** Update an existing note by id. */
  const safeId = encodeURIComponent(String(id));
  const body = JSON.stringify({
    title: payload?.title ?? "",
    content: payload?.content ?? "",
  });

  // Prefer PUT; if backend only supports PATCH, we fallback.
  try {
    const data = await requestJson(`/notes/${safeId}`, { method: "PUT", body }, signal);
    return normalizeNote(data) || null;
  } catch (e) {
    // If method not allowed, try PATCH.
    if (e?.status === 405) {
      const data = await requestJson(`/notes/${safeId}`, { method: "PATCH", body }, signal);
      return normalizeNote(data) || null;
    }
    throw e;
  }
}

// PUBLIC_INTERFACE
export async function deleteNote(id, { signal } = {}) {
  /** Delete a note by id. */
  const safeId = encodeURIComponent(String(id));
  await requestJson(`/notes/${safeId}`, { method: "DELETE" }, signal);
  return true;
}

// PUBLIC_INTERFACE
export async function searchNotes(query, { signal } = {}) {
  /**
   * Optional server-side search, if backend supports it.
   * Tries multiple common patterns.
   */
  const q = encodeURIComponent(String(query || "").trim());
  if (!q) return [];

  // Try /notes/search?q=...
  try {
    const data = await requestJson(`/notes/search?q=${q}`, { method: "GET" }, signal);
    return normalizeNotesResponse(data);
  } catch (e) {
    // ignore and try other patterns
  }

  // Try /notes/search?query=...
  try {
    const data = await requestJson(`/notes/search?query=${q}`, { method: "GET" }, signal);
    return normalizeNotesResponse(data);
  } catch (e) {
    // ignore and try other patterns
  }

  // Try /notes?q=...
  const data = await requestJson(`/notes?q=${q}`, { method: "GET" }, signal);
  return normalizeNotesResponse(data);
}

// PUBLIC_INTERFACE
export function getConfiguredApiBaseUrl() {
  /** Return currently configured API base URL (for UI diagnostics). */
  return getApiBaseUrl();
}
