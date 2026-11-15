/** Display formatting shared by server and client components. */

/**
 * Format a USD amount for dense tables.
 *
 * @param value - USD amount.
 * @returns text with four decimals below one dollar, two above.
 */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '$0.00'
  return `$${value >= 1 ? value.toFixed(2) : value.toFixed(4)}`
}

/**
 * Format a token count with Vietnamese units.
 *
 * @param value - token count.
 * @returns compact text such as `1,2 Tr`.
 */
export function formatTokens(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} Tr`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} N`
  return String(Math.max(0, Math.trunc(value)))
}

/**
 * Format a whole number with Vietnamese separators.
 *
 * @param value - count.
 * @returns grouped digits.
 */
export function formatCount(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString('vi-VN')
}

/**
 * Format a stored decimal balance for display.
 *
 * @param value - decimal string such as `12.400000`.
 * @param fractionDigits - decimals to keep.
 * @returns text without trailing zero groups.
 */
export function formatBalance(value: string, fractionDigits = 2): string {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '0.00'
  return parsed.toLocaleString('vi-VN', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
}

/**
 * Format an ISO timestamp as a Vietnamese date and time.
 *
 * @param value - ISO timestamp.
 * @returns `dd/MM/yyyy HH:mm`, or `—` for an invalid value.
 */
export function formatDateTime(value: string | null): string {
  if (value === null) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * Format an ISO date as a short Vietnamese day label.
 *
 * @param value - ISO date such as `2026-11-14`.
 * @returns `14/11`.
 */
export function formatDayLabel(value: string): string {
  const [, month, day] = value.split('-')
  return `${day}/${month}`
}
