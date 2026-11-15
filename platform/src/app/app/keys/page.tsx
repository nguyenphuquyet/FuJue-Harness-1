import { KeysView } from '@/components/app/KeysView'
import { sessionUser } from '@/lib/session'
import { listApiKeys } from '@/lib/tokens'

export const dynamic = 'force-dynamic'

/**
 * API key management route.
 *
 * @returns the keys page.
 */
export default async function KeysPage() {
  const user = await sessionUser()
  if (user === null) return null
  return <KeysView initialKeys={await listApiKeys(user.id)} />
}
