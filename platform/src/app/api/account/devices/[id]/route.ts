/** Revoke one desktop grant of the signed-in account. */
import { apiError } from '@/lib/http'
import { sessionUser } from '@/lib/session'
import { revokeAccountToken } from '@/lib/tokens'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  const { id } = await context.params
  const revoked = await revokeAccountToken(user.id, id)
  if (!revoked) return apiError(404, 'device_not_found', 'Thiết bị đã được thu hồi hoặc không tồn tại.')
  return Response.json({ revoked: true }, { headers: { 'cache-control': 'no-store' } })
}
