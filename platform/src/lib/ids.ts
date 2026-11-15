/** Opaque identifiers and digests for sessions, tokens, and authorization codes. */
import { createHash, randomBytes, randomUUID } from 'node:crypto'

/** @returns a random UUIDv4. */
export function newId(): string {
  return randomUUID()
}

/**
 * Generate a URL-safe secret.
 *
 * @param bytes - entropy size; 32 bytes keeps tokens at 256 bits.
 * @returns base64url text without padding.
 */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/**
 * Hash a bearer secret for storage.
 *
 * @param value - plaintext token or authorization code.
 * @returns lowercase SHA-256 hex digest.
 */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
