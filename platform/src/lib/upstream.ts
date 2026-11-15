/** Upstream model calls, usage extraction, and streaming passthrough. */

/** Provider credential and base URLs resolved for one model. */
export interface UpstreamEndpoint {
  readonly name: string
  readonly chatBaseUrl: string
  readonly anthropicBaseUrl: string
  readonly apiKey: string
}

/** No enabled provider has a credential for this request. */
export class UpstreamNotConfiguredError extends Error {
  constructor(message = 'FuJue Platform has no upstream provider credential.') {
    super(message)
    this.name = 'UpstreamNotConfiguredError'
  }
}

/** Chat message accepted by the OpenAI-compatible route. */
export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

/** Normalized token counts. */
export interface TokenUsage {
  readonly promptTokens: number
  readonly completionTokens: number
}

/** One chat completion request. */
export interface ChatRequest {
  readonly model: string
  readonly messages: readonly ChatMessage[]
  readonly temperature?: number
  readonly maxTokens?: number
  /** Effort string from the model's reasoning policy; an empty value sends no thinking parameter. */
  readonly reasoningEffort?: string
}

/**
 * Request one OpenAI-compatible chat completion.
 *
 * @param endpoint - resolved provider credentials and base URL.
 * @param input - model, messages, and sampling fields.
 * @param stream - whether the upstream should stream server-sent events.
 * @returns the upstream response; callers own metering and body forwarding.
 */
export async function requestChatCompletion(
  endpoint: UpstreamEndpoint,
  input: ChatRequest,
  stream = false,
): Promise<Response> {
  const body: Record<string, unknown> = {
    model: input.model,
    messages: input.messages,
    stream,
  }
  if (input.temperature !== undefined) body.temperature = input.temperature
  if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens
  if (input.reasoningEffort !== undefined && input.reasoningEffort !== '') {
    body.reasoning_effort = input.reasoningEffort
  }
  if (stream) body.stream_options = { include_usage: true }
  return fetch(`${endpoint.chatBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${endpoint.apiKey}`,
      accept: stream ? 'text/event-stream' : 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(600_000),
  })
}

/**
 * Forward one Anthropic-compatible request to the upstream provider.
 *
 * @param endpoint - resolved provider credentials and base URL.
 * @param path - request path below the Anthropic root, without a leading slash.
 * @param request - the desktop request whose method and protocol headers are reused.
 * @param body - already-read request body, so the caller can meter and rewrite it first.
 * @param search - query string of the original request, including its leading `?` when present.
 * @returns the upstream response.
 */
export async function forwardAnthropic(
  endpoint: UpstreamEndpoint,
  path: string,
  request: Request,
  body: Uint8Array | null,
  search: string,
): Promise<Response> {
  const key = endpoint.apiKey
  const headers = new Headers({
    'content-type': request.headers.get('content-type') ?? 'application/json',
    'anthropic-version': request.headers.get('anthropic-version') ?? '2023-06-01',
    // Providers in this family accept either scheme; sending both keeps the
    // gateway working for x-api-key clients and Bearer-only deployments.
    'x-api-key': key,
    authorization: `Bearer ${key}`,
    accept: request.headers.get('accept') ?? 'application/json',
    'accept-encoding': 'identity',
  })
  const beta = request.headers.get('anthropic-beta')
  if (beta !== null) headers.set('anthropic-beta', beta)
  return fetch(`${endpoint.anthropicBaseUrl}/${path}${search}`, {
    method: request.method,
    headers,
    body: body === null ? undefined : Buffer.from(body),
    signal: AbortSignal.timeout(600_000),
  })
}

/**
 * Read the thinking effort one Anthropic Messages body asks for.
 *
 * @param body - parsed request body.
 * @returns the named effort, `off` for a disabled `thinking` block, or undefined when the body names none.
 */
export function anthropicReasoningRequest(body: Record<string, unknown>): unknown {
  const output = body.output_config
  if (typeof output === 'object' && output !== null) {
    const effort = (output as { effort?: unknown }).effort
    if (typeof effort === 'string') return effort
  }
  const thinking = body.thinking
  if (typeof thinking === 'object' && thinking !== null && (thinking as { type?: unknown }).type === 'disabled') {
    return 'off'
  }
  return undefined
}

/**
 * Rewrite an Anthropic Messages body to one enforced thinking effort.
 *
 * @param body - parsed request body.
 * @param effort - effort resolved from the model policy; empty means thinking off.
 * @returns a copy of the body carrying `thinking` and, unless thinking is off, `output_config.effort`.
 */
export function withAnthropicReasoning(
  body: Record<string, unknown>,
  effort: string,
): Record<string, unknown> {
  const off = effort === ''
  const next: Record<string, unknown> = { ...body, thinking: { type: off ? 'disabled' : 'enabled' } }
  if (off) {
    delete next.output_config
    return next
  }
  const current = typeof next.output_config === 'object' && next.output_config !== null
    ? (next.output_config as Record<string, unknown>)
    : {}
  next.output_config = { ...current, effort }
  return next
}

/**
 * Read token counts from an OpenAI-compatible completion body.
 *
 * @param payload - parsed upstream JSON.
 * @returns normalized usage, or null when the body declares none.
 */
export function usageFromOpenAi(payload: unknown): TokenUsage | null {
  if (typeof payload !== 'object' || payload === null) return null
  const usage = (payload as { usage?: unknown }).usage
  if (typeof usage !== 'object' || usage === null) return null
  const record = usage as Record<string, unknown>
  const prompt = Number(record.prompt_tokens ?? 0)
  const completion = Number(record.completion_tokens ?? 0)
  if (!Number.isFinite(prompt) || !Number.isFinite(completion)) return null
  return { promptTokens: prompt, completionTokens: completion }
}

/**
 * Read token counts from an Anthropic-compatible message body.
 *
 * @param payload - parsed upstream JSON.
 * @returns normalized usage, or null when the body declares none.
 */
export function usageFromAnthropic(payload: unknown): TokenUsage | null {
  if (typeof payload !== 'object' || payload === null) return null
  const usage = (payload as { usage?: unknown }).usage
  if (typeof usage !== 'object' || usage === null) return null
  const record = usage as Record<string, unknown>
  const prompt = Number(record.input_tokens ?? 0)
  const completion = Number(record.output_tokens ?? 0)
  if (!Number.isFinite(prompt) || !Number.isFinite(completion)) return null
  return { promptTokens: prompt, completionTokens: completion }
}

/**
 * Copy an upstream response while preserving protocol-relevant headers.
 *
 * @param response - upstream response.
 * @returns a response with buffered JSON, or the original streaming body.
 */
export async function passthrough(response: Response): Promise<Response> {
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('content-encoding')
  headers.delete('transfer-encoding')
  headers.set('cache-control', 'no-store')
  if (response.body === null) return new Response(null, { status: response.status, headers })
  return new Response(response.body, { status: response.status, headers })
}

/**
 * Observe a server-sent event stream and report the last usage frame.
 *
 * The returned body streams unchanged; metering runs when the stream ends.
 *
 * @param response - upstream streaming response.
 * @param extract - reads usage from one decoded SSE frame.
 * @param onUsage - receives the last observed usage, or null when the stream reported none.
 * @returns the response with a metering tap attached.
 */
export function meterSse(
  response: Response,
  extract: (payload: unknown) => TokenUsage | null,
  onUsage: (usage: TokenUsage | null) => Promise<void>,
): Response {
  const body = response.body
  if (body === null) return response
  const decoder = new TextDecoder()
  let buffer = ''
  const tap = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk)
      buffer += decoder.decode(chunk, { stream: true })
      // Usage frames arrive last; bounding the window keeps memory flat for long answers.
      if (buffer.length > 131_072) buffer = buffer.slice(-131_072)
    },
    async flush() {
      let promptTokens = 0
      let completionTokens = 0
      let observed = false
      for (const line of buffer.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '' || data === '[DONE]') continue
        try {
          const frame = extract(JSON.parse(data) as unknown)
          if (frame !== null) {
            observed = true
            // Anthropic reports input tokens on the first frame and output tokens on the last.
            promptTokens = Math.max(promptTokens, frame.promptTokens)
            completionTokens = Math.max(completionTokens, frame.completionTokens)
          }
        } catch {
          // A frame split across chunks is not JSON; later frames still carry usage.
        }
      }
      await onUsage(observed ? { promptTokens, completionTokens } : null)
    },
  })
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('content-encoding')
  headers.delete('transfer-encoding')
  headers.set('cache-control', 'no-store')
  return new Response(body.pipeThrough(tap), { status: response.status, headers })
}
