/** `auth_exchange`: redeem a PKCE code and issue the desktop account grant. */
import { AUTHORIZED_PATH, exchangeAuthorizationCode, exchangeSchema } from '@/lib/authorization'
import { deploymentOrigin } from '@/lib/env'
import { platformFailure, platformSuccess, readJson } from '@/lib/http'
import { issueAccountToken } from '@/lib/tokens'
import { profilePayload } from '@/lib/users'

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJson(request, exchangeSchema)
  if (!parsed.ok) return parsed.response
  const user = await exchangeAuthorizationCode({
    code: parsed.value.code,
    codeVerifier: parsed.value.code_verifier,
    redirectUri: parsed.value.redirect_uri,
  })
  if (user === null) return platformFailure(400, 'Mã uỷ quyền không hợp lệ, đã dùng, hoặc đã hết hạn.')
  const token = await issueAccountToken({
    userId: user.id,
    deviceId: parsed.value.device_id ?? null,
    deviceModel: parsed.value.device_model ?? null,
    osVersion: parsed.value.os_version ?? null,
    label: parsed.value.device_model ?? 'FuJue Harness',
  })
  return platformSuccess({
    token,
    authorized_url: `${deploymentOrigin(request)}${AUTHORIZED_PATH}`,
    user: profilePayload(user),
  })
}
