/** Create a FuJue Platform account and start its browser session. */
import { z } from 'zod'
import { apiError, readJson } from '@/lib/http'
import { createSession } from '@/lib/session'
import { normalizeEmail, publicUser, registerUser } from '@/lib/users'

const schema = z.object({
  email: z.email().max(255),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(200),
  locale: z.enum(['vi', 'en']).optional(),
})

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJson(request, schema)
  if (!parsed.ok) return parsed.response
  try {
    const user = await registerUser({
      email: normalizeEmail(parsed.value.email),
      name: parsed.value.name,
      password: parsed.value.password,
      locale: parsed.value.locale,
    })
    await createSession(user.id, request.headers.get('user-agent'))
    return Response.json({ user: publicUser(user) }, { status: 201, headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY') {
      return apiError(409, 'email_taken', 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.')
    }
    throw error
  }
}
