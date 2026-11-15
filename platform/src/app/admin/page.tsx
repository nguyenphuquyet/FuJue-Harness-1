import { AdminOverviewView } from '@/components/admin/AdminOverviewView'
import { adminTotals, adminUsage, listAdminUsers, listAudit } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * Admin overview route.
 *
 * @returns the console landing page with platform counters.
 */
export default async function AdminOverviewPage() {
  const [totals, usage, users, audit] = await Promise.all([
    adminTotals(),
    adminUsage(14),
    listAdminUsers(),
    listAudit(8),
  ])
  return <AdminOverviewView totals={totals} usage={usage} users={users} audit={audit} />
}
