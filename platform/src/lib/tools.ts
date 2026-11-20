/**
 * DeepSeek Search and Fetch API proxy (`/v1/tools/search`, `/v1/tools/fetch`).
 *
 * The desktop's web search and fetch providers post the bodies the DeepSeek
 * Search API defines (`{ query, count, need_content, ori_question }` and
 * `{ url }`), so the gateway forwards them unchanged and returns the provider's
 * JSON. Both calls bill per request rather than per token, so they record no
 * usage event.
 */
import { toolsApiKey, toolsBaseUrl } from './env'
import { json } from './http'
import { defaultUpstream } from './model-store'
import { requestPrincipal } from './principal'
import { UpstreamNotConfiguredError, passthrough, rejectedPlatformCredential, type UpstreamEndpoint } from './upstream'

/** Capabilities served below `/v1/tools`. */
export type ToolsCapability = 'search' | 'fetch'

const CAPABILITIES: readonly ToolsCapability[] = ['search', 'fetch']

/** OpenAI-style error envelope for a failure the gateway raises itself. */
function failure(status: number, message: string, code: string, type = 'invalid_request_error'): Response {
  return json({ error: { message, type, code } }, status)
}

/**
 * Answer one request below `/v1/tools`.
 *
 * Provider rejections pass through unchanged so the desktop can report them;
 * only a credential the Platform itself holds becomes a gateway error, because
 * forwarding that provider 401 would make the desktop discard a valid
 * Platform credential.
 *
 * @param request - desktop request; its body is forwarded byte for byte.
 * @param path - path segments below `/v1/tools`.
 * @returns the provider response, or a JSON error the desktop reports.
 */
export async function toolsResponse(request: Request, path: readonly string[]): Promise<Response> {
  const [name, ...rest] = path
  const capability = rest.length === 0 ? CAPABILITIES.find(entry => entry === name) : undefined
  if (capability === undefined) {
    return failure(404, 'FuJue Platform serves only /v1/tools/search and /v1/tools/fetch.', 'not_found')
  }

  const principal = await requestPrincipal(request)
  if (principal === null) return failure(401, 'Missing or invalid API key.', 'invalid_api_key')

  let endpoint: UpstreamEndpoint
  try {
    endpoint = await defaultUpstream()
  } catch (error) {
    if (error instanceof UpstreamNotConfiguredError) {
      return failure(503, error.message, 'upstream_not_configured', 'server_error')
    }
    return failure(502, 'Không kết nối được nhà cung cấp mô hình.', 'upstream_unreachable', 'server_error')
  }

  const body = new Uint8Array(await request.arrayBuffer())
  const key = toolsApiKey(endpoint.apiKey)

  let upstream: Response
  try {
    upstream = await fetch(`${toolsBaseUrl(endpoint.chatBaseUrl)}/${capability}`, {
      method: 'POST',
      // The provider credential must never follow a redirect to another origin.
      redirect: 'error',
      headers: {
        'content-type': request.headers.get('content-type') ?? 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${key}`,
        'x-api-key': key,
      },
      body,
      signal: AbortSignal.timeout(600_000),
    })
  } catch {
    return failure(
      502,
      `Không kết nối được dịch vụ tìm kiếm của nhà cung cấp ${endpoint.name}.`,
      'upstream_unreachable',
      'server_error',
    )
  }

  if (rejectedPlatformCredential(upstream)) {
    return failure(
      502,
      `Nhà cung cấp ${endpoint.name} từ chối khoá API của FuJue Platform (${upstream.status}). Kiểm tra khoá trong trang quản trị.`,
      'upstream_unauthorized',
      'server_error',
    )
  }
  return passthrough(upstream)
}
