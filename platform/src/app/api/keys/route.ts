/** List and create API keys for the signed-in account. */
import { z } from 'zod'
import { apiError, readJson } from '@/lib/http'
import { sessionUser } from '@/lib/session'
import { createApiKey, listApiKeys } from '@/lib/tokens'

export async function GET(): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  return Response.json({ keys: await listApiKeys(user.id) }, { headers: { 'cache-control': 'no-store' } })
}

const schema = z.object({ name: z.string().trim().min(1).max(120) })

export async function POST(request: Request): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  const parsed = await readJson(request, schema)
  if (!parsed.ok) return parsed.response
  const created = await createApiKey(user.id, parsed.value.name)
  return Response.json(created, { status: 201, headers: { 'cache-control': 'no-store' } })
}
