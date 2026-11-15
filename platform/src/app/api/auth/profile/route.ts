/** Update the display name and interface locale. */
import { z } from 'zod'
import { apiError, readJson } from '@/lib/http'
import { sessionUser } from '@/lib/session'
import { publicUser, updateProfile } from '@/lib/users'

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  locale: z.enum(['vi', 'en']),
})

export async function PATCH(request: Request): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  const parsed = await readJson(request, schema)
  if (!parsed.ok) return parsed.response
  const updated = await updateProfile(user.id, parsed.value)
  return Response.json({ user: publicUser(updated) }, { headers: { 'cache-control': 'no-store' } })
}
