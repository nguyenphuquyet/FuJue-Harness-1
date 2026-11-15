import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/app/AppShell'
import { sessionUser } from '@/lib/session'
import { countActiveAccountTokens } from '@/lib/tokens'

export const dynamic = 'force-dynamic'

/**
 * Require a session for every dashboard route and mount the authenticated shell.
 *
 * @param props - routed dashboard page.
 * @returns the authenticated layout.
 */
export default async function DashboardLayout({ children }: { readonly children: ReactNode }) {
  const user = await sessionUser()
  if (user === null) redirect('/login?next=/app')
  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        balanceUsd: user.balanceUsd,
        bonusUsd: user.bonusUsd,
        desktopDevices: await countActiveAccountTokens(user.id),
        isAdmin: user.role === 'admin',
      }}
    >
      {children}
    </AppShell>
  )
}
