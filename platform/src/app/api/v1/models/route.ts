/** OpenAI-compatible model listing for API clients. */
import { json } from '@/lib/http'
import { loadServedModels } from '@/lib/model-store'
import { requestPrincipal } from '@/lib/principal'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const principal = await requestPrincipal(request)
  if (principal === null) {
    return json({ error: { message: 'Missing or invalid API key.', type: 'invalid_request_error', code: 'invalid_api_key' } }, 401)
  }
  const models = await loadServedModels()
  return json({
    object: 'list',
    data: models.map(model => ({
      id: model.id,
      object: 'model',
      created: 1762550400,
      owned_by: 'fujue',
      context_window: model.contextWindow,
      pricing: model.pricing,
    })),
  })
}
