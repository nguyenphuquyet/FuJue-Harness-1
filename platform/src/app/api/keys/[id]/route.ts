/** Revoke one API key owned by the signed-in account. */
import { apiError } from '@/lib/http'
import { sessionUser } from '@/lib/session'
import { revokeApiKey } from '@/lib/tokens'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  const { id } = await context.params
  const revoked = await revokeApiKey(user.id, id)
  if (!revoked) return apiError(404, 'key_not_found', 'Không tìm thấy khoá còn hiệu lực.')
  return Response.json({ revoked: true }, { headers: { 'cache-control': 'no-store' } })
}
