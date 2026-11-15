/** Anthropic-compatible proxy (`/anthropic/messages`, `/anthropic/files/...`) used by the desktop account route. */
import { json } from '@/lib/http'
import { defaultUpstream, findServedModel, upstreamForModel } from '@/lib/model-store'
import { estimateCostUsd, resolveReasoning } from '@/lib/models'
import { requestPrincipal } from '@/lib/principal'
import { debitUser, recordUsage } from '@/lib/usage'
import {
  UpstreamNotConfiguredError, anthropicReasoningRequest, forwardAnthropic, meterSse, passthrough, usageFromAnthropic,
  withAnthropicReasoning, type TokenUsage, type UpstreamEndpoint,
} from '@/lib/upstream'

interface RouteContext {
  readonly params: Promise<{ path: string[] }>
}

async function handler(request: Request, context: RouteContext): Promise<Response> {
  const principal = await requestPrincipal(request)
  if (principal === null) {
    return json({ type: 'error', error: { type: 'authentication_error', message: 'Invalid or missing credential.' } }, 401)
  }
  const { path } = await context.params
  const segments = path.map(segment => encodeURIComponent(segment))
  const body = request.method === 'GET' || request.method === 'HEAD' ? null : await request.arrayBuffer()
  let model: string | null = null
  let streaming = false
  let message: Record<string, unknown> | null = null
  if (body !== null) {
    try {
      const parsed = JSON.parse(Buffer.from(body).toString('utf8')) as Record<string, unknown>
      if (typeof parsed.model === 'string') model = parsed.model
      streaming = parsed.stream === true
      // File uploads are JSON-free; only a Messages request carries a message list.
      if (Array.isArray(parsed.messages)) message = parsed
    } catch {
      // Non-JSON bodies (file uploads) are forwarded without metering a model.
    }
  }

  const served = model === null ? undefined : await findServedModel(model)

  let endpoint: UpstreamEndpoint
  try {
    endpoint = served === undefined ? await defaultUpstream() : await upstreamForModel(served)
  } catch (error) {
    if (error instanceof UpstreamNotConfiguredError) {
      return json({ type: 'error', error: { type: 'api_error', message: error.message } }, 503)
    }
    return json({ type: 'error', error: { type: 'api_error', message: 'Upstream provider is unreachable.' } }, 502)
  }

  const forwarded: Uint8Array | null = served !== undefined && message !== null
    ? Buffer.from(JSON.stringify(withAnthropicReasoning(message, resolveReasoning(served, anthropicReasoningRequest(message)).apiValue)))
    : body === null ? null : new Uint8Array(body)

  let upstream: Response
  try {
    upstream = await forwardAnthropic(endpoint, segments.join('/'), request, forwarded, new URL(request.url).search)
  } catch {
    return json({ type: 'error', error: { type: 'api_error', message: 'Upstream provider is unreachable.' } }, 502)
  }

  const contentType = upstream.headers.get('content-type') ?? ''
  if (served === undefined) return passthrough(upstream)

  const charge = async (usage: TokenUsage | null): Promise<void> => {
    if (usage === null || upstream.status >= 400) return
    const costUsd = estimateCostUsd(served, usage.promptTokens, usage.completionTokens)
    await recordUsage({
      userId: principal.user.id,
      apiKeyId: principal.apiKeyId,
      model: served.id,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      source: principal.via === 'account-token' ? 'desktop' : principal.via === 'api-key' ? 'api' : 'playground',
      costUsd,
    })
    await debitUser(principal.user.id, costUsd)
  }

  if (!streaming && contentType.includes('application/json')) {
    const payload: unknown = await upstream.json().catch(() => null)
    await charge(usageFromAnthropic(payload))
    return json(payload, upstream.status)
  }
  if (streaming && contentType.includes('text/event-stream')) {
    return meterSse(upstream, usageFromAnthropic, charge)
  }
  return passthrough(upstream)
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return handler(request, context)
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handler(request, context)
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return handler(request, context)
}
