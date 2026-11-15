/** Change the signed-in account password. */
import { z } from 'zod'
import { apiError, readJson } from '@/lib/http'
import { sessionUser } from '@/lib/session'
import { changePassword } from '@/lib/users'

const schema = z.object({
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(8).max(200),
})

export async function POST(request: Request): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  const parsed = await readJson(request, schema)
  if (!parsed.ok) return parsed.response
  const changed = await changePassword(user.id, parsed.value.current_password, parsed.value.new_password)
  if (!changed) return apiError(403, 'invalid_password', 'Mật khẩu hiện tại không đúng.')
  return Response.json({ changed: true }, { headers: { 'cache-control': 'no-store' } })
}
