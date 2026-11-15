import Link from 'next/link'

/**
 * FuJue Platform wordmark.
 *
 * @param props - `compact` hides the wordmark on narrow layouts.
 * @returns the linked brand block.
 */
export function Brand({ compact = false }: { readonly compact?: boolean }) {
  return (
    <Link href="/" className="fj-brand" aria-label="FuJue Platform">
      <span className="fj-brand-mark">F</span>
      {compact ? null : (
        <span className="fj-brand-text">
          FuJue <span>Platform</span>
        </span>
      )}
    </Link>
  )
}
