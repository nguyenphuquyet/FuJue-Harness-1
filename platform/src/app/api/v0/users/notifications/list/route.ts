/** Unconsumed account notifications for the desktop client. */
import { desktopCaller, desktopUnauthorized } from '@/lib/desktop'
import { platformSuccess } from '@/lib/http'
import { listNotifications, requestLocale } from '@/lib/notifications'

export async function GET(request: Request): Promise<Response> {
  const caller = await desktopCaller(request)
  if (caller === null) return desktopUnauthorized()
  const notifications = await listNotifications(caller.user.id, requestLocale(request, caller.user.locale))
  return platformSuccess({ next_poll_after: 60, notifications })
}
