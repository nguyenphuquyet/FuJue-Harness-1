import type { Metadata } from 'next'
import { DesktopSessionBridge } from '@/components/app/DesktopSessionBridge'
import { TopUpView } from '@/components/app/TopUpView'
import { topUpInfo } from '@/lib/env'
import { sessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Nạp tiền' }

/**
 * Standalone recharge page opened by the Desktop account menu.
 *
 * @returns the recharge page, or the session bridge for the cookie-less embedded view.
 */
export default async function TopUpPage() {
  const user = await sessionUser()
  if (user === null) return <DesktopSessionBridge next="/top_up" />
  return (
    <main className="fj-embed-body">
      <TopUpView
        wallet={{ balanceUsd: user.balanceUsd, bonusUsd: user.bonusUsd }}
        email={user.email}
        info={topUpInfo()}
      />
    </main>
  )
}
