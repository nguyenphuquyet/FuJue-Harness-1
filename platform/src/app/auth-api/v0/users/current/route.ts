/** Current account profile for the signed-in desktop client. */
import { desktopCaller, desktopUnauthorized } from '@/lib/desktop'
import { platformSuccess } from '@/lib/http'
import { profilePayload } from '@/lib/users'

export async function GET(request: Request): Promise<Response> {
  const caller = await desktopCaller(request)
  if (caller === null) return desktopUnauthorized()
  return platformSuccess(profilePayload(caller.user))
}
