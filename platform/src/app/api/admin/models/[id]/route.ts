/** Edit or delete one catalog model. */
import { adminGuard, recordAdminAction } from '@/lib/admin'
import { modelPatchSchema } from '@/lib/admin-schemas'
import { apiError, readJson } from '@/lib/http'
import { deleteModel, updateModel } from '@/lib/model-store'

interface RouteContext {
  readonly params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const { id } = await context.params
  const parsed = await readJson(request, modelPatchSchema)
  if (!parsed.ok) return parsed.response
  const changed = Object.keys(parsed.value).filter(key => parsed.value[key as keyof typeof parsed.value] !== undefined)
  const updated = await updateModel(id, parsed.value)
  if (!updated) return apiError(404, 'model_not_found', 'Không tìm thấy mô hình.')
  await recordAdminAction(guard.admin, 'model.update', id, `Cập nhật: ${changed.join(', ') || 'không có trường'}`)
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const { id } = await context.params
  const removed = await deleteModel(id)
  if (!removed) return apiError(404, 'model_not_found', 'Không tìm thấy mô hình.')
  await recordAdminAction(guard.admin, 'model.delete', id, 'Xoá mô hình khỏi danh mục')
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}
