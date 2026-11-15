/** Sign the account out of every other browser session. */
import { apiError } from '@/lib/http'
import { currentSessionId, sessionUser } from '@/lib/session'
import { removeUserSessions } from '@/lib/users'

export async function POST(): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  const removed = await removeUserSessions(user.id, await currentSessionId())
  return Response.json({ removed }, { headers: { 'cache-control': 'no-store' } })
}
