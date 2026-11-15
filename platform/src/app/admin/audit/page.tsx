import { AdminAuditView } from '@/components/admin/AdminAuditView'
import { listAudit } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * Audit trail route.
 *
 * @returns the administrator audit log.
 */
export default async function AdminAuditPage() {
  return <AdminAuditView entries={await listAudit(200)} />
}
