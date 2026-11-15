/** Change an account's role, status, or balances from the admin console. */
import { adminGuard, recordAdminAction } from '@/lib/admin'
import { userPatchSchema } from '@/lib/admin-schemas'
import { apiError, readJson } from '@/lib/http'
import { updateAdminUser } from '@/lib/admin'

interface RouteContext {
  readonly params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const { id } = await context.params
  const parsed = await readJson(request, userPatchSchema)
  if (!parsed.ok) return parsed.response
  if (id === guard.admin.id && (parsed.value.role === 'user' || parsed.value.status === 'suspended')) {
    return apiError(400, 'self_lockout', 'Không thể tự hạ quyền hoặc tự khoá tài khoản đang dùng.')
  }
  const updated = await updateAdminUser(id, parsed.value)
  if (!updated) return apiError(404, 'user_not_found', 'Không tìm thấy tài khoản.')
  const changed: string[] = []
  if (parsed.value.role !== undefined) changed.push(`vai trò=${parsed.value.role}`)
  if (parsed.value.status !== undefined) changed.push(`trạng thái=${parsed.value.status}`)
  if (parsed.value.grantUsd !== undefined) changed.push(`cộng ${parsed.value.grantUsd.toFixed(2)} USD`)
  if (parsed.value.balanceUsd !== undefined) changed.push(`số dư=${parsed.value.balanceUsd.toFixed(2)} USD`)
  if (parsed.value.bonusUsd !== undefined) changed.push(`thưởng=${parsed.value.bonusUsd.toFixed(2)} USD`)
  await recordAdminAction(guard.admin, 'user.update', id, changed.join(', ') || 'không có thay đổi')
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}
