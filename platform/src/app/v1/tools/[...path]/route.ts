/**
 * DeepSeek Search and Fetch API proxy (`/v1/tools/search`, `/v1/tools/fetch`)
 * used by the desktop's web search and fetch providers.
 *
 * The desktop derives this path from the origin of its model route, so one
 * Platform credential covers chat, search, and fetch.
 */
import { toolsResponse } from '@/lib/tools'

interface RouteContext {
  readonly params: Promise<{ path: string[] }>
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  return toolsResponse(request, path)
}
