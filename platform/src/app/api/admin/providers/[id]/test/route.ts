/** Probe a provider's OpenAI-compatible `/models` endpoint. */
import { adminGuard, recordAdminAction } from '@/lib/admin'
import { apiError } from '@/lib/http'
import { testProvider } from '@/lib/model-store'
import { UpstreamNotConfiguredError } from '@/lib/upstream'

interface RouteContext {
  readonly params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const { id } = await context.params
  try {
    const result = await testProvider(id)
    if (result === null) return apiError(404, 'provider_not_found', 'Không tìm thấy nhà cung cấp này.')
    await recordAdminAction(guard.admin, 'provider.test', id, `Kiểm tra kết nối: HTTP ${result.status}`)
    if (result.status !== 200) {
      return apiError(502, 'provider_unreachable', `Nhà cung cấp trả về HTTP ${result.status}.`)
    }
    return Response.json(
      { ok: true, models: result.models },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (error) {
    if (error instanceof UpstreamNotConfiguredError) {
      await recordAdminAction(guard.admin, 'provider.test', id, `Không kiểm tra được: ${error.message}`)
      return apiError(400, 'provider_not_configured', error.message)
    }
    await recordAdminAction(guard.admin, 'provider.test', id, 'Không kết nối được nhà cung cấp')
    return apiError(502, 'provider_unreachable', 'Không kết nối được nhà cung cấp. Kiểm tra URL và khoá API.')
  }
}
