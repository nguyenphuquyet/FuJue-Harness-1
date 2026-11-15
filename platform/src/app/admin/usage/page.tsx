import { AdminUsageView } from '@/components/admin/AdminUsageView'
import { adminUsage } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * Platform usage route.
 *
 * @param props - optional `days` window.
 * @returns the admin usage page.
 */
export default async function AdminUsagePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days } = await searchParams
  const parsed = Number(days)
  const window = [7, 14, 30, 90].includes(parsed) ? parsed : 14
  return <AdminUsageView usage={await adminUsage(window)} />
}
