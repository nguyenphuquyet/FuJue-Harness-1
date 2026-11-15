/** `auth_init`: start a desktop PKCE sign-in and return the consent page URL. */
import { AUTHORIZE_PATH, createAuthRequest, initSchema, isAllowedRedirect, withQuery } from '@/lib/authorization'
import { deploymentOrigin } from '@/lib/env'
import { platformFailure, platformSuccess, readJson } from '@/lib/http'

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJson(request, initSchema)
  if (!parsed.ok) return parsed.response
  const origin = deploymentOrigin(request)
  if (!isAllowedRedirect(parsed.value.redirect_uri, origin)) {
    return platformFailure(400, 'Ứng dụng yêu cầu một địa chỉ chuyển hướng không được phép.')
  }
  const created = await createAuthRequest(parsed.value)
  return platformSuccess({
    authorize_url: withQuery(`${origin}${AUTHORIZE_PATH}`, { authorize_id: created.id }),
    authorize_id: created.id,
    expires_in: created.expiresIn,
  })
}
