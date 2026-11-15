/** Desktop grants and user API keys. Only digests are stored. */
import type { RowDataPacket } from 'mysql2/promise'
import { rows, write } from './db'
import { newId, randomToken, sha256Hex } from './ids'
import { findUserById, type PlatformUser } from './users'

interface AccountTokenRow extends RowDataPacket {
  user_id: string
  revoked_at: Date | null
}

interface ApiKeyRow extends RowDataPacket {
  id: string
  name: string
  prefix: string
  created_at: Date
  last_used_at: Date | null
  revoked_at: Date | null
}

interface CountRow extends RowDataPacket {
  total: number | string
}

/** One API key as listed in the dashboard; the secret never appears here. */
export interface ApiKeySummary {
  readonly id: string
  readonly name: string
  readonly prefix: string
  readonly createdAt: string
  readonly lastUsedAt: string | null
  readonly revokedAt: string | null
}

/** Token metadata captured with a desktop authorization. */
export interface AccountTokenInput {
  readonly userId: string
  readonly deviceId?: string | null
  readonly deviceModel?: string | null
  readonly osVersion?: string | null
  readonly label?: string | null
}

/**
 * Issue a desktop account grant.
 *
 * @param input - account and device identity.
 * @returns the plaintext grant; only its digest stays in the database.
 */
export async function issueAccountToken(input: AccountTokenInput): Promise<string> {
  const token = `fjk_at_${randomToken(32)}`
  await write(
    `INSERT INTO account_tokens (id, user_id, label, device_id, device_model, os_version)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sha256Hex(token),
      input.userId,
      input.label?.slice(0, 120) ?? 'Desktop',
      input.deviceId?.slice(0, 36) ?? null,
      input.deviceModel?.slice(0, 120) ?? null,
      input.osVersion?.slice(0, 120) ?? null,
    ],
  )
  return token
}

/**
 * Resolve a desktop grant to its account.
 *
 * @param token - plaintext `x-dsh-auth-token` value.
 * @returns the active account, or null for unknown or revoked grants.
 */
export async function userFromAccountToken(token: string): Promise<PlatformUser | null> {
  const [row] = await rows<AccountTokenRow>(
    'SELECT user_id, revoked_at FROM account_tokens WHERE id = ? LIMIT 1',
    [sha256Hex(token)],
  )
  if (row === undefined || row.revoked_at !== null) return null
  const user = await findUserById(row.user_id)
  if (user?.status !== 'active') return null
  await write('UPDATE account_tokens SET last_used_at = NOW(3) WHERE id = ?', [sha256Hex(token)])
  return user
}

/** One desktop grant as listed in the account settings page. */
export interface AccountTokenSummary {
  readonly id: string
  readonly label: string
  readonly deviceId: string | null
  readonly deviceModel: string | null
  readonly osVersion: string | null
  readonly createdAt: string
  readonly lastUsedAt: string | null
  readonly revokedAt: string | null
}

/**
 * List the account's desktop grants, newest first.
 *
 * @param userId - account UUID.
 * @returns grant metadata; the token itself is never recoverable.
 */
export async function listAccountTokens(userId: string): Promise<AccountTokenSummary[]> {
  const result = await rows<AccountTokenRow & {
    id: string
    label: string | null
    device_id: string | null
    device_model: string | null
    os_version: string | null
    created_at: Date
    last_used_at: Date | null
  }>(
    `SELECT id, label, device_id, device_model, os_version, created_at, last_used_at, revoked_at
     FROM account_tokens WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  )
  return result.map(row => ({
    id: row.id,
    label: row.label ?? 'Desktop',
    deviceId: row.device_id,
    deviceModel: row.device_model,
    osVersion: row.os_version,
    createdAt: row.created_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
    revokedAt: row.revoked_at?.toISOString() ?? null,
  }))
}

/**
 * Revoke one desktop grant owned by the account.
 *
 * @param userId - owning account.
 * @param tokenId - digest identifying the grant.
 * @returns whether a live grant was revoked.
 */
export async function revokeAccountToken(userId: string, tokenId: string): Promise<boolean> {
  const result = await write(
    'UPDATE account_tokens SET revoked_at = NOW(3) WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
    [tokenId, userId],
  )
  return result.affectedRows > 0
}

/**
 * Revoke every desktop grant of the account, signing out all devices.
 *
 * @param userId - owning account.
 * @returns the number of grants revoked.
 */
export async function revokeAllAccountTokens(userId: string): Promise<number> {
  const result = await write(
    'UPDATE account_tokens SET revoked_at = NOW(3) WHERE user_id = ? AND revoked_at IS NULL',
    [userId],
  )
  return result.affectedRows
}

/**
 * Count the account's live desktop grants.
 *
 * @param userId - account UUID.
 * @returns grants that were issued and never revoked.
 */
export async function countActiveAccountTokens(userId: string): Promise<number> {
  const [row] = await rows<CountRow>(
    'SELECT COUNT(*) AS total FROM account_tokens WHERE user_id = ? AND revoked_at IS NULL',
    [userId],
  )
  return Number(row?.total ?? 0)
}

/**
 * List the account's API keys, newest first.
 *
 * @param userId - account UUID.
 * @returns key metadata without secrets.
 */
export async function listApiKeys(userId: string): Promise<ApiKeySummary[]> {
  const result = await rows<ApiKeyRow>(
    'SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  )
  return result.map(row => ({
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.created_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
    revokedAt: row.revoked_at?.toISOString() ?? null,
  }))
}

/**
 * Create an API key.
 *
 * @param userId - owning account.
 * @param name - operator-facing label.
 * @returns the stored metadata and the secret to show once.
 */
export async function createApiKey(userId: string, name: string): Promise<{ record: ApiKeySummary; secret: string }> {
  const secret = `fjk_sk_${randomToken(30)}`
  const id = newId()
  await write(
    'INSERT INTO api_keys (id, user_id, name, prefix, key_hash) VALUES (?, ?, ?, ?, ?)',
    [id, userId, name.trim().slice(0, 120), secret.slice(0, 11), sha256Hex(secret)],
  )
  return {
    record: {
      id,
      name: name.trim().slice(0, 120),
      prefix: secret.slice(0, 11),
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    },
    secret,
  }
}

/**
 * Revoke a key owned by the account.
 *
 * @param userId - owning account.
 * @param keyId - key UUID.
 * @returns whether a live key was revoked.
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await write(
    'UPDATE api_keys SET revoked_at = NOW(3) WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
    [keyId, userId],
  )
  return result.affectedRows > 0
}

/**
 * Resolve a bearer secret to its account and key.
 *
 * @param secret - plaintext API key.
 * @returns the active account and key id, or null.
 */
export async function principalFromApiKey(secret: string): Promise<{ user: PlatformUser; apiKeyId: string } | null> {
  const [row] = await rows<ApiKeyRow & { user_id: string; revoked_at: Date | null }>(
    'SELECT id, user_id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE key_hash = ? LIMIT 1',
    [sha256Hex(secret)],
  )
  if (row === undefined || row.revoked_at !== null) return null
  const user = await findUserById(row.user_id)
  if (user?.status !== 'active') return null
  await write('UPDATE api_keys SET last_used_at = NOW(3) WHERE id = ?', [row.id])
  return { user, apiKeyId: row.id }
}
