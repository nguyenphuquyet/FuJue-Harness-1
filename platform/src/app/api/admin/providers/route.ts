/** Register a third-party model provider from the admin console. */
import { adminGuard, recordAdminAction } from '@/lib/admin'
import { providerCreateSchema } from '@/lib/admin-schemas'
import { readJson } from '@/lib/http'
import { createProvider } from '@/lib/model-store'

export async function POST(request: Request): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const parsed = await readJson(request, providerCreateSchema)
  if (!parsed.ok) return parsed.response
  const id = await createProvider(parsed.value)
  await recordAdminAction(guard.admin, 'provider.create', id, `Thêm nhà cung cấp ${parsed.value.name}`)
  return Response.json({ id }, { status: 201, headers: { 'cache-control': 'no-store' } })
}
