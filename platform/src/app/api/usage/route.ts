/** Usage aggregates for the signed-in account. */
import { apiError } from '@/lib/http'
import { sessionUser } from '@/lib/session'
import { usageSummary } from '@/lib/usage'

export async function GET(request: Request): Promise<Response> {
  const user = await sessionUser()
  if (user === null) return apiError(401, 'unauthorized', 'Bạn cần đăng nhập.')
  const requested = Number(new URL(request.url).searchParams.get('days') ?? '30')
  const days = [7, 14, 30, 90].includes(requested) ? requested : 30
  return Response.json(await usageSummary(user.id, days), { headers: { 'cache-control': 'no-store' } })
}
