/**
 * Anthropic-compatible proxy (`/anthropic/messages`, `/anthropic/files/...`) used by the desktop account route.
 *
 * A provider with an Anthropic-compatible URL is forwarded unchanged. A provider
 * that only offers an OpenAI-compatible URL answers `/v1/messages` through the
 * translation in `anthropic-bridge`, so one URL and one key cover both clients.
 */
import { anthropicErrorFromOpenAi, anthropicMessageFromOpenAi, anthropicStreamFromOpenAi, openAiBodyFromMessages } from '@/lib/anthropic-bridge'
import { json } from '@/lib/http'
import { defaultUpstream, findServedModel, upstreamForModel } from '@/lib/model-store'
import { estimateCostUsd, resolveReasoning, upstreamModelId } from '@/lib/models'
import { requestPrincipal } from '@/lib/principal'
import { debitUser, recordUsage } from '@/lib/usage'
import {
  UpstreamNotConfiguredError, anthropicReasoningRequest, forwardAnthropic, meterSse, passthrough,
  postChatCompletion, rejectedPlatformCredential, usageFromAnthropic, withAnthropicReasoning,
  type TokenUsage, type UpstreamEndpoint,
} from '@/lib/upstream'

interface RouteContext {
  readonly params: Promise<{ path: string[] }>
}

/** Anthropic error envelope for a failure the gateway raises itself. */
function anthropicFailure(status: number, type: string, message: string): Response {
  return json({ type: 'error', error: { type, message } }, status)
}

async function handler(request: Request, context: RouteContext): Promise<Response> {
  const principal = await requestPrincipal(request)
  if (principal === null) {
    return anthropicFailure(401, 'authentication_error', 'Invalid or missing credential.')
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
    if (error instanceof UpstreamNotConfiguredError) return anthropicFailure(503, 'api_error', error.message)
    return anthropicFailure(502, 'api_error', 'Upstream provider is unreachable.')
  }

  const effort = served !== undefined && message !== null
    ? resolveReasoning(served, anthropicReasoningRequest(message)).apiValue
    : ''

  const charge = async (usage: TokenUsage | null, status: number): Promise<void> => {
    if (served === undefined || usage === null || status >= 400) return
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

  const anthropicRoot = endpoint.anthropicBaseUrl
  if (anthropicRoot === null) {    if (message === null) {
      return anthropicFailure(
        501,
        'not_supported_error',
        `Nhà cung cấp ${endpoint.name} chỉ có giao thức OpenAI; cổng Anthropic tại đây phục vụ /v1/messages.`,
      )
    }
    const requestedModel = served?.id ?? (typeof message.model === 'string' ? message.model : '')
    let upstream: Response
    try {
      upstream = await postChatCompletion(
        endpoint,
        openAiBodyFromMessages(message, served === undefined ? requestedModel : upstreamModelId(served), effort, streaming),
        streaming,
      )
    } catch {
      return anthropicFailure(502, 'api_error', 'Không kết nối được nhà cung cấp mô hình.')
    }
    if (rejectedPlatformCredential(upstream)) {
      return anthropicFailure(
        502,
        'api_error',
        `Nhà cung cấp ${endpoint.name} từ chối khoá API của FuJue Platform (${upstream.status}). Kiểm tra khoá trong trang quản trị.`,
      )
    }
    if (!upstream.ok) {
      const payload: unknown = await upstream.json().catch(() => null)
      return json(anthropicErrorFromOpenAi(payload, upstream.status), upstream.status)
    }
    const includeThinking = effort !== ''
    if (streaming && upstream.body !== null) {
      const translated = anthropicStreamFromOpenAi(upstream, requestedModel, includeThinking)
      return meterSse(translated, usageFromAnthropic, usage => charge(usage, 200))
    }
    const payload: unknown = await upstream.json().catch(() => null)
    const translated = anthropicMessageFromOpenAi(payload, requestedModel, includeThinking)
    await charge(usageFromAnthropic(translated), 200)
    return json(translated, 200)
  }

  const forwarded: Uint8Array | null = served !== undefined && message !== null
    ? Buffer.from(JSON.stringify(
      withAnthropicReasoning({ ...message, model: upstreamModelId(served) }, effort),
    ))
    : body === null ? null : new Uint8Array(body)

  let upstream: Response
  try {
    upstream = await forwardAnthropic(
      { ...endpoint, anthropicBaseUrl: anthropicRoot },
      segments.join('/'),
      request,
      forwarded,
      new URL(request.url).search,
    )
  } catch {
    return anthropicFailure(502, 'api_error', 'Upstream provider is unreachable.')
  }

  if (rejectedPlatformCredential(upstream)) {
    return anthropicFailure(
      502,
      'api_error',
      `Nhà cung cấp ${endpoint.name} từ chối khoá API của FuJue Platform (${upstream.status}). Kiểm tra khoá trong trang quản trị.`,
    )
  }

  const contentType = upstream.headers.get('content-type') ?? ''
  if (served === undefined) return passthrough(upstream)

  if (!streaming && contentType.includes('application/json')) {
    const payload: unknown = await upstream.json().catch(() => null)
    await charge(usageFromAnthropic(payload), upstream.status)
    return json(payload, upstream.status)
  }
  if (streaming && contentType.includes('text/event-stream')) {
    return meterSse(upstream, usageFromAnthropic, usage => charge(usage, upstream.status))
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
