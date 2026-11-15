/** Edit or delete one third-party model provider. */
import { adminGuard, recordAdminAction } from '@/lib/admin'
import { providerPatchSchema } from '@/lib/admin-schemas'
import { apiError, readJson } from '@/lib/http'
import { deleteProvider, updateProvider } from '@/lib/model-store'

interface RouteContext {
  readonly params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const { id } = await context.params
  const parsed = await readJson(request, providerPatchSchema)
  if (!parsed.ok) return parsed.response
  const updated = await updateProvider(id, parsed.value)
  if (!updated) return apiError(404, 'provider_not_found', 'Không tìm thấy nhà cung cấp.')
  const changed = Object.keys(parsed.value).filter(key => key !== 'apiKey' && key !== 'clearApiKey')
  const detail = parsed.value.apiKey !== undefined && parsed.value.apiKey !== ''
    ? `Cập nhật: ${[...changed, 'apiKey'].join(', ')}`
    : `Cập nhật: ${changed.join(', ') || 'không có trường'}`
  await recordAdminAction(guard.admin, 'provider.update', id, detail)
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const { id } = await context.params
  const removed = await deleteProvider(id)
  if (!removed) return apiError(404, 'provider_not_found', 'Không tìm thấy nhà cung cấp.')
  await recordAdminAction(guard.admin, 'provider.delete', id, 'Xoá nhà cung cấp; mô hình quay về cấu hình mặc định')
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}
