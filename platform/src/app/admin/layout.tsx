import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { sessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Require the admin role for every console route.
 *
 * @param props - routed admin page.
 * @returns the admin layout.
 */
export default async function AdminLayout({ children }: { readonly children: ReactNode }) {
  const user = await sessionUser()
  if (user === null) redirect('/login?next=/admin')
  if (user.role !== 'admin') redirect('/app')
  return <AdminShell email={user.email}>{children}</AdminShell>
}
