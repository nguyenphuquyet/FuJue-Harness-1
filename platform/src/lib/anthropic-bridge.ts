/**
 * Translation between the Anthropic Messages protocol and OpenAI chat completions.
 *
 * FuJue Harness Desktop always speaks Anthropic Messages, while most third-party
 * model services only expose an OpenAI-compatible endpoint. A provider without an
 * explicit Anthropic base URL is therefore reached through this translation, so the
 * admin console only has to configure one URL and one key.
 */
import { randomToken } from './ids'

/** Content the gateway carries from one Anthropic message into an OpenAI request. */
type InputBlock =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'image'; readonly url: string }
  | { readonly kind: 'tool_use'; readonly id: string; readonly name: string; readonly input: unknown }
  | { readonly kind: 'tool_result'; readonly toolUseId: string; readonly text: string }

/** One OpenAI tool call emitted by the model. */
interface OutputToolCall {
  readonly id: string
  readonly name: string
  readonly argumentsJson: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Read the text of an Anthropic system prompt.
 *
 * @param value - `system` field, either a string or a list of text blocks.
 * @returns the joined prompt, or an empty string when the request carries none.
 */
function systemText(value: unknown): string {
  if (typeof value === 'string') return value
  return asArray(value)
    .map(entry => {
      const block = asRecord(entry)
      return block === null ? '' : asString(block.text) ?? ''
    })
    .filter(text => text !== '')
    .join('\n')
}

/**
 * Read the text carried by an Anthropic tool result.
 *
 * @param value - `content` field of a `tool_result` block.
 * @returns the joined text; images inside a result are dropped because the OpenAI
 * tool role carries text only.
 */
function resultText(value: unknown): string {
  if (typeof value === 'string') return value
  return asArray(value)
    .map(entry => {
      const block = asRecord(entry)
      return block === null || block.type !== 'text' ? '' : asString(block.text) ?? ''
    })
    .filter(text => text !== '')
    .join('\n')
}

/**
 * Flatten one Anthropic content list into the blocks the gateway forwards.
 *
 * Blocks this translation does not model — `thinking`, `tool_addition`, and
 * `tool_removal` — are dropped: declared tools are always sent, so activation
 * markers carry no extra meaning for an OpenAI upstream.
 *
 * @param content - `content` field of one Anthropic message.
 * @returns the recognised blocks in their original order.
 */
function inputBlocks(content: unknown): InputBlock[] {
  if (typeof content === 'string') return [{ kind: 'text', text: content }]
  const blocks: InputBlock[] = []
  for (const raw of asArray(content)) {
    const block = asRecord(raw)
    if (block === null) continue
    if (block.type === 'text') {
      const text = asString(block.text)
      if (text !== null) blocks.push({ kind: 'text', text })
    } else if (block.type === 'image') {
      const source = asRecord(block.source)
      const mediaType = source === null ? null : asString(source.media_type)
      const data = source === null ? null : asString(source.data)
      if (mediaType !== null && data !== null) {
        blocks.push({ kind: 'image', url: `data:${mediaType};base64,${data}` })
      }
    } else if (block.type === 'tool_use') {
      const id = asString(block.id)
      const name = asString(block.name)
      if (id !== null && name !== null) blocks.push({ kind: 'tool_use', id, name, input: block.input })
    } else if (block.type === 'tool_result') {
      const toolUseId = asString(block.tool_use_id)
      if (toolUseId !== null) blocks.push({ kind: 'tool_result', toolUseId, text: resultText(block.content) })
    }
  }
  return blocks
}

/**
 * Render a user or system turn as OpenAI message content.
 *
 * @param blocks - blocks left after tool results moved to their own messages.
 * @returns a plain string for text-only content, otherwise the OpenAI content parts.
 */
function userContent(blocks: readonly InputBlock[]): string | readonly Record<string, unknown>[] {
  if (blocks.every(block => block.kind === 'text')) {
    return blocks.map(block => (block.kind === 'text' ? block.text : '')).join('')
  }
  const parts: Record<string, unknown>[] = []
  for (const block of blocks) {
    if (block.kind === 'text') parts.push({ type: 'text', text: block.text })
    else if (block.kind === 'image') parts.push({ type: 'image_url', image_url: { url: block.url } })
  }
  return parts
}

/**
 * Convert the declared Anthropic tools into OpenAI function tools.
 *
 * @param value - `tools` field of the Messages body.
 * @returns OpenAI tools; an empty list when the request declares none.
 */
function toolDefinitions(value: unknown): Record<string, unknown>[] {
  const tools: Record<string, unknown>[] = []
  for (const raw of asArray(value)) {
    const tool = asRecord(raw)
    if (tool === null) continue
    const name = asString(tool.name)
    if (name === null) continue
    tools.push({
      type: 'function',
      function: {
        name,
        description: asString(tool.description) ?? '',
        parameters: asRecord(tool.input_schema) ?? { type: 'object', properties: {} },
      },
    })
  }
  return tools
}

/**
 * Build the OpenAI chat completions body for one Anthropic Messages request.
 *
 * @param body - parsed Anthropic Messages request.
 * @param upstreamModel - provider model id that replaces the Platform listing id.
 * @param effort - reasoning effort resolved from the model policy; empty disables thinking.
 * @param stream - whether the caller wants server-sent events.
 * @returns the request body for `/chat/completions`.
 */
export function openAiBodyFromMessages(
  body: Record<string, unknown>,
  upstreamModel: string,
  effort: string,
  stream: boolean,
): Record<string, unknown> {
  const messages: Record<string, unknown>[] = []
  const system = systemText(body.system)
  if (system !== '') messages.push({ role: 'system', content: system })

  for (const raw of asArray(body.messages)) {
    const message = asRecord(raw)
    if (message === null) continue
    const role = asString(message.role)
    const blocks = inputBlocks(message.content)
    // OpenAI answers a tool call with a dedicated `tool` turn, so results leave the user turn.
    for (const block of blocks) {
      if (block.kind !== 'tool_result') continue
      messages.push({ role: 'tool', tool_call_id: block.toolUseId, content: block.text })
    }
    const rest = blocks.filter(block => block.kind !== 'tool_result')
    if (rest.length === 0) continue
    if (role === 'assistant') {
      const text = rest.map(block => (block.kind === 'text' ? block.text : '')).join('')
      const calls = rest.filter(block => block.kind === 'tool_use')
      if (text === '' && calls.length === 0) continue
      const entry: Record<string, unknown> = { role: 'assistant', content: text }
      if (calls.length > 0) {
        entry.tool_calls = calls.map(call => call.kind === 'tool_use'
          ? { id: call.id, type: 'function', function: { name: call.name, arguments: JSON.stringify(call.input ?? {}) } }
          : null).filter(call => call !== null)
      }
      messages.push(entry)
    } else {
      messages.push({ role: role === 'system' ? 'system' : 'user', content: userContent(rest) })
    }
  }

  const request: Record<string, unknown> = { model: upstreamModel, messages, stream }
  const maxTokens = asNumber(body.max_tokens)
  if (maxTokens !== null) request.max_tokens = maxTokens
  const temperature = asNumber(body.temperature)
  if (temperature !== null) request.temperature = temperature
  const topP = asNumber(body.top_p)
  if (topP !== null) request.top_p = topP
  const stop = asArray(body.stop_sequences).filter(entry => typeof entry === 'string')
  if (stop.length > 0) request.stop = stop
  if (effort !== '') request.reasoning_effort = effort
  const tools = toolDefinitions(body.tools)
  if (tools.length > 0) request.tools = tools
  if (stream) request.stream_options = { include_usage: true }
  return request
}

/**
 * Map an OpenAI finish reason onto the Anthropic stop reason the desktop reads.
 *
 * @param reason - OpenAI `finish_reason`.
 * @param usedTools - whether the answer carried tool calls.
 * @returns the Anthropic stop reason.
 */
function stopReason(reason: unknown, usedTools: boolean): string {
  if (usedTools) return 'tool_use'
  if (reason === 'length') return 'max_tokens'
  return 'end_turn'
}

/**
 * Read the text of an OpenAI message content field.
 *
 * @param content - string content, or a list of content parts.
 * @returns the joined text.
 */
function messageText(content: unknown): string {
  if (typeof content === 'string') return content
  return asArray(content)
    .map(part => {
      const block = asRecord(part)
      return block === null ? '' : asString(block.text) ?? ''
    })
    .filter(text => text !== '')
    .join('')
}

/**
 * Read the tool calls of one OpenAI assistant message.
 *
 * @param value - `tool_calls` field.
 * @returns calls with their serialized arguments preserved verbatim.
 */
function outputToolCalls(value: unknown): OutputToolCall[] {
  const calls: OutputToolCall[] = []
  for (const raw of asArray(value)) {
    const call = asRecord(raw)
    if (call === null) continue
    const fn = asRecord(call.function)
    const name = fn === null ? null : asString(fn.name)
    if (name === null) continue
    calls.push({
      id: asString(call.id) ?? `toolu_${randomToken(12)}`,
      name,
      argumentsJson: (fn === null ? null : asString(fn.arguments)) ?? '{}',
    })
  }
  return calls
}

/**
 * Parse one tool-call argument string into the object Anthropic expects.
 *
 * @param json - arguments as the provider serialized them.
 * @returns the parsed object, or an empty object when the provider sent invalid JSON.
 */
function toolInput(json: string): Record<string, unknown> {
  try {
    return asRecord(JSON.parse(json)) ?? {}
  } catch {
    // A truncated argument string is reported to the caller as an empty input.
    return {}
  }
}

/**
 * Convert one non-streaming OpenAI completion into an Anthropic message.
 *
 * @param payload - parsed `/chat/completions` response.
 * @param model - Platform listing id the caller asked for.
 * @param includeThinking - whether to keep the provider's reasoning text as a thinking block.
 * @returns the Anthropic message body.
 */
export function anthropicMessageFromOpenAi(
  payload: unknown,
  model: string,
  includeThinking: boolean,
): Record<string, unknown> {
  const envelope = asRecord(payload) ?? {}
  const choice = asRecord(asArray(envelope.choices)[0]) ?? {}
  const message = asRecord(choice.message) ?? {}
  const content: Record<string, unknown>[] = []
  const reasoning = includeThinking ? asString(message.reasoning_content) ?? asString(message.reasoning) : null
  if (reasoning !== null && reasoning !== '') content.push({ type: 'thinking', thinking: reasoning })
  const text = messageText(message.content)
  if (text !== '') content.push({ type: 'text', text })
  const calls = outputToolCalls(message.tool_calls)
  for (const call of calls) {
    content.push({ type: 'tool_use', id: call.id, name: call.name, input: toolInput(call.argumentsJson) })
  }
  const usage = asRecord(envelope.usage) ?? {}
  const inputTokens = asNumber(usage.prompt_tokens) ?? 0
  const outputTokens = asNumber(usage.completion_tokens) ?? 0
  return {
    id: `msg_${randomToken(16)}`,
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: stopReason(choice.finish_reason, calls.length > 0),
    stop_sequence: null,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_input_tokens: asNumber(asRecord(usage.prompt_tokens_details)?.cached_tokens) ?? 0,
      cache_creation_input_tokens: 0,
    },
  }
}

/**
 * Convert an OpenAI error body into the Anthropic error envelope.
 *
 * @param payload - parsed provider error body, of any shape.
 * @param status - HTTP status the gateway reports.
 * @returns the Anthropic error body.
 */
export function anthropicErrorFromOpenAi(payload: unknown, status: number): Record<string, unknown> {
  const envelope = asRecord(payload)
  const error = envelope === null ? null : asRecord(envelope.error)
  const message = error === null
    ? `Nhà cung cấp mô hình trả lỗi ${status}.`
    : asString(error.message) ?? `Nhà cung cấp mô hình trả lỗi ${status}.`
  const type = status === 400 ? 'invalid_request_error'
    : status === 404 ? 'not_found_error'
      : status === 429 ? 'rate_limit_error'
        : status === 401 || status === 403 ? 'authentication_error'
          : status >= 500 ? 'api_error' : 'invalid_request_error'
  return { type: 'error', error: { type, message } }
}

/** Server-sent event frames the gateway writes back to the desktop. */
function frame(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`event: ${String(event.type)}\ndata: ${JSON.stringify(event)}\n\n`)
}

/** One Anthropic content block the translator has opened on the wire. */
interface OpenBlock {
  readonly index: number
}

/**
 * Rewrite an OpenAI server-sent event stream as Anthropic Messages events.
 *
 * The desktop's translator requires `message_start` before any block, one
 * `content_block_stop` per opened block, and a `message_delta` carrying the stop
 * reason before `message_stop`.
 *
 * @param response - streaming OpenAI `/chat/completions` response.
 * @param model - Platform listing id the caller asked for.
 * @param includeThinking - whether to keep the provider's reasoning deltas as thinking blocks.
 * @returns an Anthropic event stream carrying the same answer.
 */
export function anthropicStreamFromOpenAi(
  response: Response,
  model: string,
  includeThinking: boolean,
): Response {
  const decoder = new TextDecoder()
  const body = response.body
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let current: OpenBlock | null = null
      let openKey: string | null = null
      let nextIndex = 0
      let stop: string | null = null
      let inputTokens = 0
      let outputTokens = 0
      let usedTools = false

      const write = (event: Record<string, unknown>): void => {
        controller.enqueue(frame(event))
      }
      const closeCurrent = (): void => {
        if (current === null) return
        write({ type: 'content_block_stop', index: current.index })
        current = null
        openKey = null
      }
      const open = (key: string, block: Record<string, unknown>): OpenBlock => {
        // Anthropic streams one block at a time, so a new block closes the previous one.
        closeCurrent()
        current = { index: nextIndex++ }
        openKey = key
        write({ type: 'content_block_start', index: current.index, content_block: block })
        return current
      }
      const ensure = (key: string, block: Record<string, unknown>): OpenBlock =>
        current !== null && openKey === key ? current : open(key, block)

      write({
        type: 'message_start',
        message: {
          id: `msg_${randomToken(16)}`,
          type: 'message',
          role: 'assistant',
          model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      })

      const handle = (payload: Record<string, unknown>): void => {
        const usage = asRecord(payload.usage)
        if (usage !== null) {
          inputTokens = Math.max(inputTokens, asNumber(usage.prompt_tokens) ?? 0)
          outputTokens = Math.max(outputTokens, asNumber(usage.completion_tokens) ?? 0)
        }
        const choice = asRecord(asArray(payload.choices)[0])
        if (choice === null) return
        const delta = asRecord(choice.delta) ?? {}
        const reasoning = includeThinking ? asString(delta.reasoning_content) ?? asString(delta.reasoning) : null
        if (reasoning !== null && reasoning !== '') {
          const block = ensure('thinking', { type: 'thinking', thinking: '' })
          write({ type: 'content_block_delta', index: block.index, delta: { type: 'thinking_delta', thinking: reasoning } })
        }
        const text = asString(delta.content)
        if (text !== null && text !== '') {
          const block = ensure('text', { type: 'text', text: '' })
          write({ type: 'content_block_delta', index: block.index, delta: { type: 'text_delta', text } })
        }
        for (const raw of asArray(delta.tool_calls)) {
          const call = asRecord(raw)
          if (call === null) continue
          const key = `tool:${String(asNumber(call.index) ?? 0)}`
          const fn = asRecord(call.function) ?? {}
          const name = asString(fn.name)
          let block = current !== null && openKey === key ? current : null
          if (block === null) {
            usedTools = true
            block = open(key, {
              type: 'tool_use',
              id: asString(call.id) ?? `toolu_${randomToken(12)}`,
              name: name ?? '',
              input: {},
            })
          }
          const partial = asString(fn.arguments)
          if (partial !== null && partial !== '') {
            write({ type: 'content_block_delta', index: block.index, delta: { type: 'input_json_delta', partial_json: partial } })
          }
        }
        if (choice.finish_reason !== null && choice.finish_reason !== undefined) {
          stop = stopReason(choice.finish_reason, usedTools)
        }
      }

      let buffer = ''
      const consume = (): void => {
        let split = buffer.indexOf('\n\n')
        while (split >= 0) {
          const block = buffer.slice(0, split)
          buffer = buffer.slice(split + 2)
          for (const line of block.split('\n')) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (data === '' || data === '[DONE]') continue
            let payload: unknown
            try {
              payload = JSON.parse(data)
            } catch {
              // A frame the provider split across chunks is not JSON; later frames still parse.
              continue
            }
            const record = asRecord(payload)
            if (record !== null) handle(record)
          }
          split = buffer.indexOf('\n\n')
        }
      }
      if (body !== null) {
        const reader = body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '')
          consume()
        }
      }

      closeCurrent()
      write({
        type: 'message_delta',
        delta: { stop_reason: stop ?? (usedTools ? 'tool_use' : 'end_turn'), stop_sequence: null },
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      })
      write({ type: 'message_stop' })
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    },
  })
}
