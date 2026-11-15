/** Consent decision from the authorize page. */
import { z } from 'zod'
import { approveAuthRequest, denyAuthRequest, withQuery } from '@/lib/authorization'
import { apiError, readJson } from '@/lib/http'
import { sessionUser } from '@/lib/session'

const schema = z.object({
  authorize_id: z.string().min(1).max(64),
  decision: z.enum(['approve', 'deny']),
})

export async function POST(request: Request): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập để tiếp tục.')
  const parsed = await readJson(request, schema)
  if (!parsed.ok) return parsed.response

  if (parsed.value.decision === 'deny') {
    const denied = await denyAuthRequest(parsed.value.authorize_id)
    if (denied === null) return apiError(409, 'request_unavailable', 'Yêu cầu đăng nhập đã hết hạn. Hãy thử lại từ ứng dụng.')
    const url = withQuery(denied.redirectUri, { error: 'access_denied', state: denied.state })
    return Response.json({ redirect_url: url }, { headers: { 'cache-control': 'no-store' } })
  }

  const approved = await approveAuthRequest(parsed.value.authorize_id, user.id)
  if (approved === null) return apiError(409, 'request_unavailable', 'Yêu cầu đăng nhập đã hết hạn. Hãy thử lại từ ứng dụng.')
  const url = withQuery(approved.redirectUri, { code: approved.code, state: approved.state })
  return Response.json({ redirect_url: url }, { headers: { 'cache-control': 'no-store' } })
}
