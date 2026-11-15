import { LandingPageView } from '@/components/LandingPageView'
import { loadServedModels } from '@/lib/model-store'
import { sessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Public landing route.
 *
 * @returns the marketing page with the live model catalog and the visitor's session state.
 */
export default async function LandingPage() {
  const [models, user] = await Promise.all([loadServedModels(), sessionUser()])
  return <LandingPageView models={models} signedIn={user !== null} />
}
