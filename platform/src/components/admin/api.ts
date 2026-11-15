/** Browser helpers shared by the admin console views. */

/**
 * Send one admin mutation and report the failure message.
 *
 * @param method - HTTP method the endpoint accepts.
 * @param url - admin API path.
 * @param body - JSON body, or undefined for a bodyless request.
 * @returns the Vietnamese failure message, or null when the request succeeded.
 */
export async function sendAdminJson(
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  url: string,
  body?: unknown,
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.ok) return null
    const payload: unknown = await response.json().catch(() => null)
    const message =
      typeof payload === 'object' && payload !== null
        ? (payload as { error?: { message?: unknown } }).error?.message
        : undefined
    return typeof message === 'string' && message !== ''
      ? message
      : `Yêu cầu thất bại (HTTP ${response.status}).`
  } catch {
    return 'Không kết nối được máy chủ. Thử lại sau.'
  }
}
