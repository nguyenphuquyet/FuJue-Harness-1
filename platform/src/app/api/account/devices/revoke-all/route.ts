/** Revoke every desktop grant of the signed-in account. */
import { apiError } from '@/lib/http'
import { sessionUser } from '@/lib/session'
import { revokeAllAccountTokens } from '@/lib/tokens'

export async function POST(): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  const revoked = await revokeAllAccountTokens(user.id)
  return Response.json({ revoked }, { headers: { 'cache-control': 'no-store' } })
}
