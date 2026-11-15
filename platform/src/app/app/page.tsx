import { OverviewView } from '@/components/app/OverviewView'
import { listNotifications } from '@/lib/notifications'
import { sessionUser } from '@/lib/session'
import { listApiKeys } from '@/lib/tokens'
import { usageSummary } from '@/lib/usage'

export const dynamic = 'force-dynamic'

/**
 * Dashboard overview route.
 *
 * @returns the overview page.
 */
export default async function OverviewPage() {
  const user = await sessionUser()
  if (user === null) return null
  const [summary, keys, notifications] = await Promise.all([
    usageSummary(user.id, 30),
    listApiKeys(user.id),
    listNotifications(user.id, user.locale),
  ])
  return (
    <OverviewView
      user={{
        name: user.name,
        balanceUsd: user.balanceUsd,
        bonusUsd: user.bonusUsd,
      }}
      summary={summary}
      keys={keys}
      notifications={notifications}
    />
  )
}
