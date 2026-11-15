/** Browser sessions backed by an HttpOnly cookie and the `sessions` table. */
import { cookies } from 'next/headers'
import type { RowDataPacket } from 'mysql2/promise'
import { rows, write } from './db'
import { secureCookies } from './env'
import { randomToken, sha256Hex } from './ids'
import { findUserById, type PlatformUser } from './users'

interface SessionRow extends RowDataPacket {
  user_id: string
}

const SESSION_COOKIE = 'fujue_session'
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

/**
 * Create a browser session and attach its cookie.
 *
 * Only call this from a route handler or server action, where cookies are mutable.
 *
 * @param userId - authenticated account UUID.
 * @param userAgent - request user agent, truncated for diagnostics.
 */
export async function createSession(userId: string, userAgent: string | null): Promise<void> {
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  await write(
    'INSERT INTO sessions (id, user_id, user_agent, expires_at) VALUES (?, ?, ?, ?)',
    [sha256Hex(token), userId, userAgent?.slice(0, 500) ?? null, expiresAt],
  )
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies(),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

/**
 * Read the signed-in account for the current request.
 *
 * @returns the active account, or null without a valid, unexpired session cookie.
 */
export async function sessionUser(): Promise<PlatformUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token === undefined || token === '') return null
  const [row] = await rows<SessionRow>(
    'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW(3) LIMIT 1',
    [sha256Hex(token)],
  )
  if (row === undefined) return null
  const user = await findUserById(row.user_id)
  return user?.status === 'active' ? user : null
}

/**
 * Read the digest identifying the current browser session.
 *
 * @returns the stored session key, or null when the request has no session cookie.
 */
export async function currentSessionId(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  return token === undefined || token === '' ? null : sha256Hex(token)
}

/**
 * Delete the current session row and clear its cookie.
 *
 * Only call this from a route handler or server action.
 */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token !== undefined) await write('DELETE FROM sessions WHERE id = ?', [sha256Hex(token)])
  store.delete(SESSION_COOKIE)
}
