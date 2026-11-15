import { AdminNotificationsView } from '@/components/admin/AdminNotificationsView'
import { listAdminNotifications, listAdminUsers } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * Desktop notification route.
 *
 * @returns the notification management page.
 */
export default async function AdminNotificationsPage() {
  const [notifications, users] = await Promise.all([listAdminNotifications(), listAdminUsers()])
  return (
    <AdminNotificationsView
      notifications={notifications}
      users={users.map(user => ({ id: user.id, email: user.email }))}
    />
  )
}
