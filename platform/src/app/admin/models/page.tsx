import { AdminModelsView } from '@/components/admin/AdminModelsView'
import { loadAllModels, loadProviderViews } from '@/lib/model-store'

export const dynamic = 'force-dynamic'

/**
 * Model catalog route.
 *
 * @returns the model management page.
 */
export default async function AdminModelsPage() {
  const [models, providers] = await Promise.all([loadAllModels(), loadProviderViews()])
  return (
    <AdminModelsView
      models={models}
      providers={providers.map(provider => ({ id: provider.id, name: provider.name }))}
    />
  )
}
