/** Create catalog models from the admin console. */
import { adminGuard, recordAdminAction } from '@/lib/admin'
import { modelCreateSchema } from '@/lib/admin-schemas'
import { isDuplicateEntry } from '@/lib/db'
import { apiError, readJson } from '@/lib/http'
import { createModel } from '@/lib/model-store'

export async function POST(request: Request): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const parsed = await readJson(request, modelCreateSchema)
  if (!parsed.ok) return parsed.response
  try {
    await createModel(parsed.value)
  } catch (error) {
    if (isDuplicateEntry(error)) return apiError(409, 'model_exists', 'Id mô hình đã tồn tại.')
    throw error
  }
  await recordAdminAction(guard.admin, 'model.create', parsed.value.id, `Tạo mô hình ${parsed.value.name}`)
  return Response.json({ ok: true }, { status: 201, headers: { 'cache-control': 'no-store' } })
}
