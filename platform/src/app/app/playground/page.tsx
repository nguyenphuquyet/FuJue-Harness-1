import { PlaygroundView } from '@/components/app/PlaygroundView'
import { loadServedModels } from '@/lib/model-store'
import { DEFAULT_MODELS } from '@/lib/models'
import { sessionUser } from '@/lib/session'
import { totalBalanceUsd } from '@/lib/users'

export const dynamic = 'force-dynamic'

/**
 * Playground route.
 *
 * @param props - query string selecting the starting model.
 * @returns the playground page.
 */
export default async function PlaygroundPage({ searchParams }: { searchParams: Promise<{ model?: string }> }) {
  const user = await sessionUser()
  if (user === null) return null
  const models = await loadServedModels()
  const available = models.length === 0 ? DEFAULT_MODELS : models
  const { model } = await searchParams
  const known = available.some(entry => entry.id === model)
  return (
    <PlaygroundView
      initialModel={known && model !== undefined ? model : available[0].id}
      models={available.map(entry => ({
        id: entry.id,
        name: entry.name,
        tagline: entry.tagline,
        pricing: entry.pricing,
      }))}
      balanceUsd={totalBalanceUsd(user)}
    />
  )
}
