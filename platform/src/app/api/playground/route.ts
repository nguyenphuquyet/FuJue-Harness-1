/** Playground completions for the signed-in browser account. */
import { z } from 'zod'
import { apiError, readJson } from '@/lib/http'
import { findServedModel, upstreamForModel } from '@/lib/model-store'
import { estimateCostUsd, upstreamModelId } from '@/lib/models'
import { sessionUser } from '@/lib/session'
import { debitUser, recordUsage } from '@/lib/usage'
import { totalBalanceUsd } from '@/lib/users'
import { UpstreamNotConfiguredError, requestChatCompletion, usageFromOpenAi } from '@/lib/upstream'

const schema = z.object({
  model: z.string().min(1).max(120),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().max(32_000),
      }),
    )
    .min(1)
    .max(100),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(8192).optional(),
})

export async function POST(request: Request): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  const parsed = await readJson(request, schema)
  if (!parsed.ok) return parsed.response
  const served = await findServedModel(parsed.value.model)
  if (served === undefined) {
    return apiError(404, 'model_not_found', 'Mô hình này không có trên FuJue Platform.')
  }
  if (totalBalanceUsd(user) <= 0) return apiError(402, 'insufficient_quota', 'Số dư đã hết. Nạp thêm để tiếp tục.')

  let upstream: Response
  try {
    upstream = await requestChatCompletion(await upstreamForModel(served), {
      model: upstreamModelId(served),
      messages: parsed.value.messages,
      temperature: parsed.value.temperature,
      maxTokens: parsed.value.maxTokens,
    })
  } catch (error) {
    if (error instanceof UpstreamNotConfiguredError) {
      return apiError(503, 'upstream_not_configured', error.message)
    }
    return apiError(502, 'upstream_unreachable', 'Không kết nối được nhà cung cấp mô hình. Thử lại sau.')
  }
  const payload: unknown = await upstream.json().catch(() => null)
  if (!upstream.ok) {
    const message = typeof payload === 'object' && payload !== null
      ? String((payload as { error?: { message?: unknown } }).error?.message ?? 'Nhà cung cấp trả về lỗi.')
      : 'Nhà cung cấp trả về lỗi.'
    return apiError(upstream.status, 'upstream_error', message)
  }
  const usage = usageFromOpenAi(payload)
  const content = typeof payload === 'object' && payload !== null
    ? (payload as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content
    : undefined
  let costUsd = 0
  if (usage !== null) {
    costUsd = estimateCostUsd(served, usage.promptTokens, usage.completionTokens)
    await recordUsage({
      userId: user.id,
      apiKeyId: null,
      model: served.id,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      source: 'playground',
      costUsd,
    })
    await debitUser(user.id, costUsd)
  }
  return Response.json(
    {
      content: typeof content === 'string' ? content : '',
      model: served.id,
      usage: usage ?? { promptTokens: 0, completionTokens: 0 },
      costUsd,
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
