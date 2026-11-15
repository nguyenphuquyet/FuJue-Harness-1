/** End the browser session. */
import { destroyCurrentSession } from '@/lib/session'

export async function POST(): Promise<Response> {
  await destroyCurrentSession()
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}
