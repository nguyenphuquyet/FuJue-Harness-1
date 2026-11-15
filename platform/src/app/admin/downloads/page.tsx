import { AdminDownloadsView } from '@/components/admin/AdminDownloadsView'
import { loadDownloadConfig } from '@/lib/downloads'

export const dynamic = 'force-dynamic'

/**
 * Download publishing route.
 *
 * @returns the installer settings page.
 */
export default async function AdminDownloadsPage() {
  return <AdminDownloadsView config={await loadDownloadConfig()} />
}
