import { LandingPageView } from '@/components/LandingPageView'
import { loadServedModels } from '@/lib/model-store'

export const dynamic = 'force-dynamic'

/**
 * Public landing route.
 *
 * @returns the marketing page with the live model catalog.
 */
export default async function LandingPage() {
  return <LandingPageView models={await loadServedModels()} />
}
