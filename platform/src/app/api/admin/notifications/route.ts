/** Publish a desktop notice from the admin console. */
import { adminGuard, createAdminNotification, recordAdminAction } from '@/lib/admin'
import { notificationSchema } from '@/lib/admin-schemas'
import { readJson } from '@/lib/http'

export async function POST(request: Request): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const parsed = await readJson(request, notificationSchema)
  if (!parsed.ok) return parsed.response
  const id = await createAdminNotification({
    ...parsed.value,
    href: parsed.value.href === '' ? null : parsed.value.href,
  })
  await recordAdminAction(
    guard.admin,
    'notification.create',
    id,
    `${parsed.value.audience === 'all' ? 'Tất cả tài khoản' : 'Một tài khoản'} · ${parsed.value.titleVi}`,
  )
  return Response.json({ id }, { status: 201, headers: { 'cache-control': 'no-store' } })
}
