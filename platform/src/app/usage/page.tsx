import type { Metadata } from 'next'
import { DesktopSessionBridge } from '@/components/app/DesktopSessionBridge'
import { StandaloneShell } from '@/components/app/StandaloneShell'
import { UsageView } from '@/components/app/UsageView'
import { sessionUser } from '@/lib/session'
import { usageSummary } from '@/lib/usage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Sử dụng' }

/**
 * Standalone usage page opened by the Desktop account menu.
 *
 * The embedded Desktop view starts without cookies, so an unauthenticated
 * document renders the session bridge instead of the aggregates.
 *
 * @param props - query string selecting the window in days.
 * @returns the usage page.
 */
export default async function UsagePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await sessionUser()
  if (user === null) return <DesktopSessionBridge next="/usage" />
  const { days } = await searchParams
  const requested = Number(days ?? '30')
  const range = [7, 14, 30, 90].includes(requested) ? requested : 30
  return (
    <StandaloneShell email={user.email}>
      <UsageView summary={await usageSummary(user.id, range)} basePath="/usage" showPlayground={false} />
    </StandaloneShell>
  )
}
