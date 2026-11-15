/** End the desktop session: revoke the presented grant. */
import { desktopCaller, desktopUnauthorized } from '@/lib/desktop'
import { write } from '@/lib/db'
import { platformSuccess } from '@/lib/http'
import { sha256Hex } from '@/lib/ids'

export async function POST(request: Request): Promise<Response> {
  const caller = await desktopCaller(request)
  if (caller === null) return desktopUnauthorized()
  await write('UPDATE account_tokens SET revoked_at = NOW(3) WHERE id = ? AND revoked_at IS NULL', [sha256Hex(caller.token)])
  return platformSuccess({ ok: true })
}
