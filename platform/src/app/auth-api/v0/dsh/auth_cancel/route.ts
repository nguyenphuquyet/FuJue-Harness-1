/** `auth_cancel`: the desktop client abandoned a pending sign-in. */
import { cancelAuthRequest, cancelSchema } from '@/lib/authorization'
import { platformSuccess, readJson } from '@/lib/http'

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJson(request, cancelSchema)
  if (!parsed.ok) return parsed.response
  const cancelled = await cancelAuthRequest(parsed.value.authorize_id)
  return platformSuccess({ cancelled })
}
