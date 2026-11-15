/** scrypt password hashes stored as `scrypt$<salt hex>$<digest hex>`. */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

/**
 * Hash a password with a fresh salt.
 *
 * @param password - plaintext password.
 * @returns a self-describing hash string.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const digest = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `scrypt$${salt}$${digest}`
}

/**
 * Compare a password with a stored hash.
 *
 * @param password - plaintext candidate.
 * @param stored - value produced by {@link hashPassword}.
 * @returns whether the password matches; malformed hashes never match.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, digest] = stored.split('$')
  if (scheme !== 'scrypt' || salt === undefined || digest === undefined) return false
  const expected = Buffer.from(digest, 'hex')
  if (expected.length !== KEY_LENGTH) return false
  const actual = scryptSync(password, salt, KEY_LENGTH)
  return timingSafeEqual(expected, actual)
}
