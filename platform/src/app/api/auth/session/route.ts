/** Read the signed-in browser account. */
import { sessionUser } from '@/lib/session'
import { publicUser } from '@/lib/users'

export async function GET(): Promise<Response> {
  const user = await sessionUser()
  return Response.json({ user: user === null ? null : publicUser(user) }, { headers: { 'cache-control': 'no-store' } })
}
