import { AdminProvidersView } from '@/components/admin/AdminProvidersView'
import { anthropicBaseUrl, openAiBaseUrl, upstreamApiKey } from '@/lib/env'
import { loadProviderViews } from '@/lib/model-store'

export const dynamic = 'force-dynamic'

/**
 * Provider configuration route.
 *
 * @returns the provider management page.
 */
export default async function AdminProvidersPage() {
  return (
    <AdminProvidersView
      providers={await loadProviderViews()}
      fallback={{
        chatBaseUrl: openAiBaseUrl(),
        anthropicBaseUrl: anthropicBaseUrl(),
        keyConfigured: upstreamApiKey() !== undefined,
      }}
    />
  )
}
