import { DocsContent } from '@/components/DocsContent'
import { SiteHeader } from '@/components/SiteHeader'

export const metadata = { title: 'Tài liệu' }

/**
 * Public documentation route linked from the marketing pages.
 *
 * @returns the documentation page without the dashboard shell.
 */
export default function PublicDocsPage() {
  return (
    <div>
      <SiteHeader />
      <main className="fj-container" style={{ padding: '48px 0 80px' }}>
        <DocsContent />
      </main>
    </div>
  )
}
