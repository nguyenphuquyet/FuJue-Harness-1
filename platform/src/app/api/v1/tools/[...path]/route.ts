/**
 * Alias of `/v1/tools/*` under the gateway's documented `/api/v1` prefix, so
 * both the path the desktop derives and the path the API reference shows reach
 * the same proxy.
 */
import { toolsResponse } from '@/lib/tools'

interface RouteContext {
  readonly params: Promise<{ path: string[] }>
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  return toolsResponse(request, path)
}
