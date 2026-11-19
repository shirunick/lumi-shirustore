export function withSignal<T extends Record<string, unknown>>(
  base: T,
  signal?: AbortSignal,
): T | (T & { signal: AbortSignal }) {
  if (!signal) return base
  return { ...base, signal }
}
