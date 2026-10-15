/** Joins class names and skips falsy values: cx('a', isActive && 'b'). */
export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/** Appends `addition` to `text` with exactly one space between them. */
export function joinText(text: string, addition: string) {
  if (!addition) return text;
  if (!text) return addition;
  return text.endsWith(' ') ? text + addition : `${text} ${addition}`;
}

/** Formats a number of seconds as mm:ss. */
export function formatDuration(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Rounds a score and keeps it within 0–100. */
export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Browser-side fetch helper. Parses JSON and throws an Error carrying the
 * server's `error` message when the response is not OK.
 */
export async function fetchJson<T>(url: string, init?: RequestInit, fallbackError = 'Request failed.'): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || fallbackError);
  return data as T;
}

export function postJson<T>(url: string, body: unknown, fallbackError?: string) {
  return fetchJson<T>(
    url,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    fallbackError,
  );
}

/** Turns an unknown thrown value into a user-facing message. */
export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
