import { UsageView } from '@/components/app/UsageView'
import { sessionUser } from '@/lib/session'
import { usageSummary } from '@/lib/usage'

export const dynamic = 'force-dynamic'

/**
 * Usage dashboard route.
 *
 * @param props - query string selecting the window in days.
 * @returns the usage page.
 */
export default async function UsagePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await sessionUser()
  if (user === null) return null
  const { days } = await searchParams
  const requested = Number(days ?? '30')
  const window = [7, 14, 30, 90].includes(requested) ? requested : 30
  return <UsageView summary={await usageSummary(user.id, window)} />
}
