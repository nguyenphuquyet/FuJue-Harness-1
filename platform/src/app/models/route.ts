/** `/models` at the deployment origin: the catalog the desktop account route decodes. */
import { json } from '@/lib/http'
import { loadServedModels } from '@/lib/model-store'
import { listingPayload } from '@/lib/models'
import { requestPrincipal } from '@/lib/principal'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const principal = await requestPrincipal(request)
  if (principal === null) return json({ error: { code: 'unauthorized', message: 'Cần đăng nhập để xem danh sách mô hình.' } }, 401)
  return json(listingPayload(await loadServedModels()))
}
