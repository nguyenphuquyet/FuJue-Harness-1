/** Platform accounts: registration, credentials, profile projection, and balances. */
import type { RowDataPacket } from 'mysql2/promise'
import { rows, write } from './db'
import { newId } from './ids'
import { hashPassword, verifyPassword } from './password'

interface UserRow extends RowDataPacket {
  id: string
  email: string
  password_hash: string
  name: string
  avatar_url: string | null
  locale: string
  timezone_offset_seconds: number
  status: 'active' | 'suspended'
  role: 'user' | 'admin'
  balance_usd: string
  bonus_usd: string
  created_at: Date
}

interface PasswordRow extends RowDataPacket {
  password_hash: string
}

/** Account facts shared by pages, browser APIs, and the desktop protocol. */
export interface PlatformUser {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly avatarUrl: string | null
  readonly locale: string
  readonly status: 'active' | 'suspended'
  readonly role: 'user' | 'admin'
  /** Recharge balance as a decimal string, as stored. */
  readonly balanceUsd: string
  /** Bonus balance as a decimal string, as stored. */
  readonly bonusUsd: string
  readonly createdAt: string
}

function mapUser(row: UserRow): PlatformUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    locale: row.locale,
    status: row.status,
    role: row.role,
    balanceUsd: row.balance_usd,
    bonusUsd: row.bonus_usd,
    createdAt: row.created_at.toISOString(),
  }
}

/**
 * Read one account by id.
 *
 * @param id - account UUID.
 * @returns the account, or null when it does not exist.
 */
export async function findUserById(id: string): Promise<PlatformUser | null> {
  const [row] = await rows<UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
  return row === undefined ? null : mapUser(row)
}

/**
 * Read one account by normalized email.
 *
 * @param email - address the caller supplied.
 * @returns the account, or null when it does not exist.
 */
export async function findUserByEmail(email: string): Promise<PlatformUser | null> {
  const [row] = await rows<UserRow>('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizeEmail(email)])
  return row === undefined ? null : mapUser(row)
}

/**
 * Verify an email and password pair.
 *
 * @param email - address the caller supplied.
 * @param password - plaintext candidate.
 * @returns the active account, or null for unknown, suspended, or wrong credentials.
 */
export async function authenticate(email: string, password: string): Promise<PlatformUser | null> {
  const [row] = await rows<UserRow>('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizeEmail(email)])
  if (row === undefined) return null
  if (!verifyPassword(password, row.password_hash)) return null
  if (row.status !== 'active') return null
  return mapUser(row)
}

/** Registration input accepted by the browser form. */
export interface RegistrationInput {
  readonly email: string
  readonly name: string
  readonly password: string
  readonly locale?: string
}

/**
 * Create an account with the platform trial balances.
 *
 * @param input - validated registration fields.
 * @returns the created account.
 * @throws When the email is already registered.
 */
export async function registerUser(input: RegistrationInput): Promise<PlatformUser> {
  const id = newId()
  await write(
    `INSERT INTO users (id, email, password_hash, name, locale, balance_usd, bonus_usd)
     VALUES (?, ?, ?, ?, ?, 0.000000, 1.000000)`,
    [id, normalizeEmail(input.email), hashPassword(input.password), input.name.trim(), input.locale ?? 'vi'],
  )
  const user = await findUserById(id)
  if (user === null) throw new Error('user row vanished after insert')
  return user
}

/** Editable account fields. */
export interface ProfileUpdate {
  readonly name: string
  readonly locale: string
}

/**
 * Update the display name and interface locale.
 *
 * @param userId - account UUID.
 * @param update - validated values.
 * @returns the updated account.
 */
export async function updateProfile(userId: string, update: ProfileUpdate): Promise<PlatformUser> {
  await write('UPDATE users SET name = ?, locale = ? WHERE id = ?', [update.name.trim(), update.locale, userId])
  const user = await findUserById(userId)
  if (user === null) throw new Error('user row vanished after update')
  return user
}

/**
 * Replace the account password after verifying the current one.
 *
 * @param userId - account UUID.
 * @param currentPassword - plaintext password the caller presented.
 * @param nextPassword - new plaintext password.
 * @returns false when the current password does not match.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  nextPassword: string,
): Promise<boolean> {
  const [row] = await rows<PasswordRow>(
    'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
    [userId],
  )
  if (row === undefined || !verifyPassword(currentPassword, row.password_hash)) return false
  await write('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(nextPassword), userId])
  return true
}

/**
 * Delete every browser session of the account except an optional current one.
 *
 * @param userId - account UUID.
 * @param keepSessionId - digest of the session to keep, or null to remove all.
 * @returns the number of sessions removed.
 */
export async function removeUserSessions(userId: string, keepSessionId: string | null): Promise<number> {
  const result = keepSessionId === null
    ? await write('DELETE FROM sessions WHERE user_id = ?', [userId])
    : await write('DELETE FROM sessions WHERE user_id = ? AND id <> ?', [userId, keepSessionId])
  return result.affectedRows
}

/**
 * Normalize an email for storage and lookup.
 *
 * @param email - caller-supplied address.
 * @returns lowercase, trimmed text.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Account payload of `auth_exchange` and `/auth-api/v0/users/current`. */
export function profilePayload(user: PlatformUser): unknown {
  return {
    id: user.id,
    email: user.email,
    id_profile: { name: user.name, picture: user.avatarUrl },
  }
}

/** Browser-safe account fields for the dashboard. */
export interface PublicUser {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly avatarUrl: string | null
  readonly locale: string
  readonly balanceUsd: string
  readonly bonusUsd: string
  readonly createdAt: string
  readonly status: 'active' | 'suspended'
  readonly role: 'user' | 'admin'
}

/**
 * Project an account for browser JSON responses.
 *
 * @param user - stored account.
 * @returns fields the dashboard renders, without credentials.
 */
export function publicUser(user: PlatformUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    balanceUsd: user.balanceUsd,
    bonusUsd: user.bonusUsd,
    createdAt: user.createdAt,
    status: user.status,
    role: user.role,
  }
}

/** Wallet payload of `/api/v0/users/get_user_summary`. */
export function summaryPayload(user: PlatformUser): unknown {
  return {
    normal_wallets: [{ currency: 'USD', balance: user.balanceUsd }],
    bonus_wallets: [{ currency: 'USD', balance: user.bonusUsd }],
  }
}

/**
 * Sum the two wallet balances for display and quota checks.
 *
 * @param user - account with stored decimal strings.
 * @returns USD total.
 */
export function totalBalanceUsd(user: PlatformUser): number {
  return Number(user.balanceUsd) + Number(user.bonusUsd)
}
