/** Remove a desktop notice. */
import { adminGuard, deleteAdminNotification, recordAdminAction } from '@/lib/admin'
import { apiError } from '@/lib/http'

interface RouteContext {
  readonly params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const { id } = await context.params
  const removed = await deleteAdminNotification(id)
  if (!removed) return apiError(404, 'notification_not_found', 'Không tìm thấy thông báo.')
  await recordAdminAction(guard.admin, 'notification.delete', id, 'Xoá thông báo')
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}
