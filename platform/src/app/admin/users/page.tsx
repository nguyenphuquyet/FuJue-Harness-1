import { AdminUsersView } from '@/components/admin/AdminUsersView'
import { listAdminUsers } from '@/lib/admin'
import { sessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Account administration route.
 *
 * @param props - optional `q` search term.
 * @returns the user management page.
 */
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const [users, admin] = await Promise.all([listAdminUsers(query), sessionUser()])
  return <AdminUsersView users={users} query={query} selfId={admin?.id ?? ''} />
}
