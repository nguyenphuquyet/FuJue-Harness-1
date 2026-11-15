/** Same-site return paths accepted from query strings. */

/**
 * Read a same-site return path.
 *
 * @param value - requested `next` value.
 * @param fallback - destination used when the value is missing or leaves this site.
 * @returns an internal absolute path.
 */
export function safeNext(value: string | undefined, fallback = '/app'): string {
  if (value === undefined || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
