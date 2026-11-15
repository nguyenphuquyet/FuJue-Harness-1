/** OpenAI-compatible chat completions with metering and wallet debit. */
import { z } from 'zod'
import { json } from '@/lib/http'
import { findServedModel, upstreamForModel } from '@/lib/model-store'
import { estimateCostUsd, resolveReasoning, upstreamModelId, type PlatformModel } from '@/lib/models'
import { requestPrincipal, type Principal } from '@/lib/principal'
import { debitUser, recordUsage } from '@/lib/usage'
import { totalBalanceUsd } from '@/lib/users'
import {
  UpstreamNotConfiguredError, meterSse, passthrough, rejectedPlatformCredential, requestChatCompletion, usageFromOpenAi,
  type TokenUsage,
} from '@/lib/upstream'

const schema = z.object({
  model: z.string().min(1).max(120),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
    )
    .min(1)
    .max(500),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(65_536).optional(),
  // Any level id is accepted; the model policy clamps unknown values to its default.
  reasoning_effort: z.string().min(1).max(40).optional(),
  stream: z.boolean().optional(),
})

function failure(status: number, message: string, code: string, type = 'invalid_request_error'): Response {
  return json({ error: { message, type, code } }, status)
}

function sourceOf(principal: Principal): 'playground' | 'api' | 'desktop' {
  if (principal.via === 'account-token') return 'desktop'
  return principal.via === 'api-key' ? 'api' : 'playground'
}

async function meter(principal: Principal, model: PlatformModel, usage: TokenUsage | null, status: number): Promise<void> {
  if (usage === null || status >= 400) return
  const costUsd = estimateCostUsd(model, usage.promptTokens, usage.completionTokens)
  await recordUsage({
    userId: principal.user.id,
    apiKeyId: principal.apiKeyId,
    model: model.id,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    source: sourceOf(principal),
    costUsd,
  })
  await debitUser(principal.user.id, costUsd)
}

export async function POST(request: Request): Promise<Response> {
  const principal = await requestPrincipal(request)
  if (principal === null) return failure(401, 'Missing or invalid API key.', 'invalid_api_key')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return failure(400, 'Request body must be JSON.', 'invalid_json')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return failure(400, 'Request body does not match the chat completions schema.', 'invalid_request')
  const served = await findServedModel(parsed.data.model)
  if (served === undefined) {
    return failure(404, `Model ${parsed.data.model} is not served by FuJue Platform.`, 'model_not_found')
  }
  if (totalBalanceUsd(principal.user) <= 0) {
    return failure(402, 'Số dư đã hết. Nạp thêm tại FuJue Platform để tiếp tục.', 'insufficient_quota', 'insufficient_quota')
  }

  let upstream: Response
  try {
    upstream = await requestChatCompletion(
      await upstreamForModel(served),
      {
        model: upstreamModelId(served),
        messages: parsed.data.messages,
        temperature: parsed.data.temperature,
        maxTokens: parsed.data.max_tokens,
        reasoningEffort: resolveReasoning(served, parsed.data.reasoning_effort).apiValue,
      },
      parsed.data.stream === true,
    )
  } catch (error) {
    if (error instanceof UpstreamNotConfiguredError) {
      return failure(503, error.message, 'upstream_not_configured', 'server_error')
    }
    return failure(502, 'Không kết nối được nhà cung cấp mô hình.', 'upstream_unreachable', 'server_error')
  }

  if (rejectedPlatformCredential(upstream)) {
    return failure(
      502,
      'Nhà cung cấp mô hình từ chối khoá API của FuJue Platform. Kiểm tra khoá trong trang quản trị.',
      'upstream_unauthorized',
      'server_error',
    )
  }

  if (parsed.data.stream === true && upstream.ok && upstream.body !== null) {
    return meterSse(upstream, usageFromOpenAi, async usage => meter(principal, served, usage, upstream.status))
  }
  if (upstream.headers.get('content-type')?.includes('application/json') === true) {
    const payload: unknown = await upstream.json().catch(() => null)
    await meter(principal, served, usageFromOpenAi(payload), upstream.status)
    return json(payload, upstream.status)
  }
  return passthrough(upstream)
}
