/** Response helpers for the browser API and the desktop Platform protocol. */
import type { z } from 'zod'

const NO_STORE = { 'cache-control': 'no-store' } as const

/**
 * Serialize JSON with request-scoped caching disabled.
 *
 * @param data - response body.
 * @param status - HTTP status.
 * @returns a `no-store` JSON response.
 */
export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE })
}

/**
 * Wrap business data in the desktop Platform envelope.
 *
 * @param bizData - payload the desktop client parses.
 * @returns the `{ code: 0, data: { biz_code: 0, biz_data } }` envelope.
 */
export function platformEnvelope(bizData: unknown): unknown {
  return { code: 0, data: { biz_code: 0, biz_data: bizData } }
}

/**
 * Answer a desktop Platform request with a successful envelope.
 *
 * @param bizData - payload the desktop client parses.
 * @returns a `no-store` JSON response.
 */
export function platformSuccess(bizData: unknown): Response {
  return json(platformEnvelope(bizData))
}

/**
 * Answer a desktop Platform request with a failed envelope and matching HTTP status.
 *
 * @param status - HTTP status; 401 tells the desktop client its grant expired.
 * @param message - operator-facing reason, never a secret.
 * @param bizCode - business code the desktop client may classify.
 * @returns a `no-store` JSON response.
 */
export function platformFailure(status: number, message: string, bizCode = 40000): Response {
  return json({ code: bizCode, message, data: { biz_code: bizCode, biz_data: null } }, status)
}

/** One machine-readable browser API failure. */
export interface ApiErrorBody {
  readonly error: { readonly code: string; readonly message: string }
}

/**
 * Answer a browser API request with a coded failure.
 *
 * @param status - HTTP status.
 * @param code - stable machine code, such as `invalid_credentials`.
 * @param message - Vietnamese message safe to display.
 * @returns a `no-store` JSON response.
 */
export function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } } satisfies ApiErrorBody, status)
}

/**
 * Parse and validate a JSON request body.
 *
 * @param request - incoming request; bodies above 1 MiB are refused.
 * @param schema - zod schema describing the accepted body.
 * @returns validated value, or a ready 400/413 response.
 */
export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  let text: string
  try {
    text = await request.text()
  } catch {
    return { ok: false, response: apiError(400, 'unreadable_body', 'Không đọc được nội dung yêu cầu.') }
  }
  if (text.length > 1_048_576) {
    return { ok: false, response: apiError(413, 'body_too_large', 'Nội dung yêu cầu quá lớn.') }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, response: apiError(400, 'invalid_json', 'Nội dung yêu cầu không phải JSON hợp lệ.') }
  }
  const result = schema.safeParse(parsed)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') ?? ''
    return {
      ok: false,
      response: apiError(400, 'invalid_request', path === '' ? 'Dữ liệu yêu cầu không hợp lệ.' : `Trường "${path}" không hợp lệ.`),
    }
  }
  return { ok: true, value: result.data }
}
