import { SettingsView } from '@/components/app/SettingsView'
import { sessionUser } from '@/lib/session'
import { listAccountTokens } from '@/lib/tokens'

export const dynamic = 'force-dynamic'

/**
 * Account settings route.
 *
 * @returns the settings page.
 */
export default async function SettingsPage() {
  const user = await sessionUser()
  if (user === null) return null
  return (
    <SettingsView
      user={{
        name: user.name,
        email: user.email,
        locale: user.locale,
        balanceUsd: user.balanceUsd,
        bonusUsd: user.bonusUsd,
        createdAt: user.createdAt,
      }}
      devices={await listAccountTokens(user.id)}
    />
  )
}
