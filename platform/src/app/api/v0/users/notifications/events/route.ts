/** Notification interactions reported by the desktop client. */
import { z } from 'zod'
import { desktopCaller, desktopUnauthorized } from '@/lib/desktop'
import { platformFailure, platformSuccess, readJson } from '@/lib/http'
import { recordNotificationEvent } from '@/lib/notifications'

const schema = z.object({
  notification_id: z.string().min(1).max(64),
  type: z.enum(['displayed', 'cta_clicked', 'dismissed']),
})

export async function POST(request: Request): Promise<Response> {
  const caller = await desktopCaller(request)
  if (caller === null) return desktopUnauthorized()
  const parsed = await readJson(request, schema)
  if (!parsed.ok) return parsed.response
  const accepted = await recordNotificationEvent(caller.user.id, parsed.value.notification_id, parsed.value.type)
  if (!accepted) return platformFailure(404, 'Không tìm thấy thông báo.')
  return platformSuccess({ acked: true })
}
