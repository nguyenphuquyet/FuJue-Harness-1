/** Authentication of desktop-protocol requests. */
import { platformFailure } from './http'
import { userFromAccountToken } from './tokens'
import type { PlatformUser } from './users'

/** Resolved desktop caller. */
export interface DesktopCaller {
  readonly user: PlatformUser
  readonly token: string
}

/**
 * Read the grant presented in `x-dsh-auth-token`.
 *
 * @param request - incoming desktop request.
 * @returns the caller, or null when the header is missing, revoked, or unknown.
 */
export async function desktopCaller(request: Request): Promise<DesktopCaller | null> {
  const token = request.headers.get('x-dsh-auth-token')?.trim()
  if (token === undefined || token === '') return null
  const user = await userFromAccountToken(token)
  return user === null ? null : { user, token }
}

/**
 * Standard withheld response: HTTP 401 makes the desktop client discard its grant.
 *
 * @returns a failed Platform envelope.
 */
export function desktopUnauthorized(): Response {
  return platformFailure(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
}
