/** Resolve the caller of a browser or model request. */
import { sessionUser } from './session'
import { principalFromApiKey, userFromAccountToken } from './tokens'
import type { PlatformUser } from './users'

/** Authenticated caller of one request. */
export interface Principal {
  readonly user: PlatformUser
  readonly apiKeyId: string | null
  readonly via: 'session' | 'account-token' | 'api-key'
}

/**
 * Read the bearer secret presented by a model client.
 *
 * @param request - incoming request.
 * @returns the secret from `x-dsh-auth-token`, `x-api-key`, or `Authorization: Bearer`.
 */
export function presentedSecret(request: Request): string | null {
  const desktop = request.headers.get('x-dsh-auth-token')
  if (desktop !== null && desktop !== '') return desktop
  const apiKey = request.headers.get('x-api-key')
  if (apiKey !== null && apiKey !== '') return apiKey
  const authorization = request.headers.get('authorization')
  if (authorization !== null) {
    const [scheme, value] = authorization.split(' ')
    if (scheme?.toLowerCase() === 'bearer' && value !== undefined && value !== '') return value
  }
  return null
}

/**
 * Resolve any accepted credential to its account.
 *
 * Desktop grants (`fjk_at_`), API keys (`fjk_sk_`), and the browser session cookie
 * are all accepted so the playground reuses the same request path as the API.
 *
 * @param request - incoming request.
 * @returns the caller, or null when no credential resolves.
 */
export async function requestPrincipal(request: Request): Promise<Principal | null> {
  const secret = presentedSecret(request)
  if (secret !== null) {
    if (secret.startsWith('fjk_at_')) {
      const user = await userFromAccountToken(secret)
      return user === null ? null : { user, apiKeyId: null, via: 'account-token' }
    }
    const principal = await principalFromApiKey(secret)
    return principal === null ? null : { user: principal.user, apiKeyId: principal.apiKeyId, via: 'api-key' }
  }
  const user = await sessionUser()
  return user === null ? null : { user, apiKeyId: null, via: 'session' }
}
