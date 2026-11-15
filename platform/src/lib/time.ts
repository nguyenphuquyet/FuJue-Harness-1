/** Timestamp formatting for the desktop Platform protocol. */

/**
 * Format a database timestamp as an ISO instant with an explicit numeric offset.
 *
 * The desktop notification reader accepts offsets (`+00:00`), so UTC is rendered
 * that way instead of as a `Z` suffix.
 *
 * @param value - database `DATETIME(3)` value.
 * @returns ISO text, or null for a null timestamp.
 */
export function isoUtc(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().replace(/Z$/, '+00:00')
}
