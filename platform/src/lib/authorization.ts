/** PKCE authorization requests that bind a desktop sign-in to an account. */
import { createHash } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { rows, write } from './db'
import { newId, randomToken, sha256Hex } from './ids'
import { findUserById, type PlatformUser } from './users'

/** Browser authorization lifetime advertised by `auth_init`. */
export const AUTHORIZATION_TTL_SECONDS = 600

/** Browser paths the desktop client validates after each step. */
export const AUTHORIZE_PATH = '/dsh/authorize'
export const AUTHORIZED_PATH = '/dsh/authorized'

interface AuthRequestRow extends RowDataPacket {
  id: string
  code_challenge: string
  code_challenge_method: string
  state: string
  redirect_uri: string
  locale: string | null
  login_source: string | null
  user_id: string | null
  code_hash: string | null
  status: 'pending' | 'approved' | 'exchanged' | 'cancelled' | 'expired'
  expires_at: Date
  created_at: Date
}

/** Validated `auth_init` body. */
export const initSchema = z.object({
  code_challenge: z.string().min(32).max(128),
  code_challenge_method: z.literal('S256'),
  state: z.string().min(1).max(256),
  redirect_uri: z.url().max(1024),
  locale: z.string().max(16).optional(),
  login_source: z.enum(['web', 'desktop']).optional(),
})

/** Validated `auth_exchange` body. */
export const exchangeSchema = z.object({
  code: z.string().min(16).max(256),
  code_verifier: z.string().min(32).max(128),
  redirect_uri: z.url().max(1024),
  device_id: z.string().max(64).optional(),
  device_model: z.string().max(120).optional(),
  os_version: z.string().max(120).optional(),
})

/** Validated `auth_cancel` body. */
export const cancelSchema = z.object({
  authorize_id: z.string().min(1).max(64),
  code_verifier: z.string().max(128).optional(),
})

/** Pending request as the consent page renders it. */
export interface AuthorizationView {
  readonly id: string
  readonly redirectUri: string
  readonly locale: string | null
  readonly loginSource: string | null
  readonly status: AuthRequestRow['status']
  readonly expiresAt: string
}

/**
 * Accept the browser callback destinations the desktop app uses.
 *
 * Loopback HTTP must carry an explicit port; HTTPS must belong to this deployment
 * or an origin listed in `ALLOWED_REDIRECT_ORIGINS`.
 *
 * @param value - requested redirect URI.
 * @param deploymentOrigin - this deployment's origin.
 * @returns whether the URI may receive an authorization code.
 */
export function isAllowedRedirect(value: string, deploymentOrigin: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.username !== '' || url.password !== '' || url.hash !== '') return false
  if (url.protocol === 'https:') {
    if (url.origin === deploymentOrigin) return true
    const allowlist = (process.env.ALLOWED_REDIRECT_ORIGINS ?? '')
      .split(',')
      .map(entry => entry.trim())
      .filter(entry => entry !== '')
    return allowlist.includes(url.origin)
  }
  return url.protocol === 'http:'
    && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    && url.port !== ''
}

/**
 * Persist a validated authorization request.
 *
 * @param input - PKCE challenge, state, redirect, and client hints.
 * @returns the new request id and lifetime in seconds.
 */
export async function createAuthRequest(input: z.infer<typeof initSchema>): Promise<{ id: string; expiresIn: number }> {
  const id = newId()
  await write(
    `INSERT INTO auth_requests
       (id, code_challenge, code_challenge_method, state, redirect_uri, locale, login_source, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(3), INTERVAL ? SECOND))`,
    [
      id,
      input.code_challenge,
      input.code_challenge_method,
      input.state,
      input.redirect_uri,
      input.locale ?? null,
      input.login_source ?? null,
      AUTHORIZATION_TTL_SECONDS,
    ],
  )
  return { id, expiresIn: AUTHORIZATION_TTL_SECONDS }
}

/**
 * Read a request for the consent page.
 *
 * @param id - authorization request UUID.
 * @returns the view, or null when it does not exist.
 */
export async function readAuthRequest(id: string): Promise<AuthorizationView | null> {
  const [row] = await rows<AuthRequestRow>('SELECT * FROM auth_requests WHERE id = ? LIMIT 1', [id])
  if (row === undefined) return null
  return {
    id: row.id,
    redirectUri: row.redirect_uri,
    locale: row.locale,
    loginSource: row.login_source,
    status: row.status,
    expiresAt: row.expires_at.toISOString(),
  }
}

/**
 * Approve a pending request and mint its one-time code.
 *
 * @param id - authorization request UUID.
 * @param userId - signed-in account approving the request.
 * @returns the code, redirect target, and state to append, or null when the request is gone or expired.
 */
export async function approveAuthRequest(
  id: string,
  userId: string,
): Promise<{ code: string; redirectUri: string; state: string } | null> {
  const [row] = await rows<AuthRequestRow>('SELECT * FROM auth_requests WHERE id = ? LIMIT 1', [id])
  if (row === undefined || row.status !== 'pending') return null
  if (row.expires_at.getTime() <= Date.now()) return null
  const code = randomToken(32)
  const result = await write(
    `UPDATE auth_requests
     SET status = 'approved', user_id = ?, code_hash = ?, approved_at = NOW(3)
     WHERE id = ? AND status = 'pending'`,
    [userId, sha256Hex(code), id],
  )
  if (result.affectedRows !== 1) return null
  return { code, redirectUri: row.redirect_uri, state: row.state }
}

/**
 * Deny a pending request.
 *
 * @param id - authorization request UUID.
 * @returns the redirect target and state for an `access_denied` callback, or null.
 */
export async function denyAuthRequest(id: string): Promise<{ redirectUri: string; state: string } | null> {
  const [row] = await rows<AuthRequestRow>('SELECT * FROM auth_requests WHERE id = ? LIMIT 1', [id])
  if (row === undefined || row.status !== 'pending') return null
  await write("UPDATE auth_requests SET status = 'cancelled' WHERE id = ? AND status = 'pending'", [id])
  return { redirectUri: row.redirect_uri, state: row.state }
}

/**
 * Cancel a request the desktop client abandoned.
 *
 * @param id - authorization request UUID.
 * @returns whether a pending request was cancelled.
 */
export async function cancelAuthRequest(id: string): Promise<boolean> {
  const result = await write("UPDATE auth_requests SET status = 'cancelled' WHERE id = ? AND status = 'pending'", [id])
  return result.affectedRows > 0
}

/**
 * Redeem an authorization code with its PKCE verifier.
 *
 * @param input - code, verifier, and redirect URI from `auth_exchange`.
 * @returns the account that approved the request, or null for any invalid or replayed code.
 */
export async function exchangeAuthorizationCode(
  input: { code: string; codeVerifier: string; redirectUri: string },
): Promise<PlatformUser | null> {
  const [row] = await rows<AuthRequestRow>('SELECT * FROM auth_requests WHERE code_hash = ? LIMIT 1', [sha256Hex(input.code)])
  if (row === undefined || row.status !== 'approved' || row.user_id === null || row.code_hash === null) return null
  if (row.redirect_uri !== input.redirectUri) return null
  if (row.expires_at.getTime() <= Date.now()) return null
  const challenge = createHash('sha256').update(input.codeVerifier).digest('base64url')
  if (row.code_challenge_method !== 'S256' || challenge !== row.code_challenge) return null
  const result = await write(
    "UPDATE auth_requests SET status = 'exchanged', exchanged_at = NOW(3) WHERE id = ? AND status = 'approved'",
    [row.id],
  )
  if (result.affectedRows !== 1) return null
  return findUserById(row.user_id)
}

/**
 * Append query parameters without dropping an existing query string.
 *
 * @param uri - base URI.
 * @param params - values to set or replace.
 * @returns the composed URI.
 */
export function withQuery(uri: string, params: Record<string, string>): string {
  const url = new URL(uri)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.href
}
