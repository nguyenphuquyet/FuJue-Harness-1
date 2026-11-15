/** Start a browser session for an existing account. */
import { z } from 'zod'
import { apiError, readJson } from '@/lib/http'
import { createSession } from '@/lib/session'
import { authenticate, publicUser } from '@/lib/users'

const schema = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(200),
})

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJson(request, schema)
  if (!parsed.ok) return parsed.response
  const user = await authenticate(parsed.value.email, parsed.value.password)
  if (user === null) return apiError(401, 'invalid_credentials', 'Email hoặc mật khẩu không đúng.')
  await createSession(user.id, request.headers.get('user-agent'))
  return Response.json({ user: publicUser(user) }, { headers: { 'cache-control': 'no-store' } })
}
