/**
 * Exchange a Desktop account grant for a browser session.
 *
 * The embedded Platform view of FuJue Harness Desktop starts without cookies,
 * so its first document posts its account grant here and reloads into an
 * ordinary cookie session.
 */
import { z } from 'zod'
import { apiError, json, readJson } from '@/lib/http'
import { createSession } from '@/lib/session'
import { userFromAccountToken } from '@/lib/tokens'
import { publicUser } from '@/lib/users'

const schema = z.object({
  token: z.string().min(1).max(200).startsWith('fjk_at_'),
})

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJson(request, schema)
  if (!parsed.ok) return parsed.response
  const user = await userFromAccountToken(parsed.value.token)
  if (user === null) {
    return apiError(401, 'invalid_grant', 'Phiên Desktop đã hết hạn. Đăng nhập lại trong ứng dụng.')
  }
  await createSession(user.id, request.headers.get('user-agent'))
  return json({ user: publicUser(user) })
}
