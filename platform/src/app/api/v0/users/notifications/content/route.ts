/** Localized notification content, including consumed cards. */
import { desktopCaller, desktopUnauthorized } from '@/lib/desktop'
import { platformFailure, platformSuccess } from '@/lib/http'
import { notificationById, requestLocale } from '@/lib/notifications'

export async function GET(request: Request): Promise<Response> {
  const caller = await desktopCaller(request)
  if (caller === null) return desktopUnauthorized()
  const id = new URL(request.url).searchParams.get('id')?.trim()
  if (id === undefined || id === '') return platformFailure(400, 'Thiếu mã thông báo.')
  const notification = await notificationById(caller.user.id, id, requestLocale(request, caller.user.locale))
  if (notification === null) return platformFailure(404, 'Không tìm thấy thông báo.')
  return platformSuccess(notification)
}
